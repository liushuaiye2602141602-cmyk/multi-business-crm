import fs from "node:fs";

function loadEnv() {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function publicDbTarget() {
  const url = new URL(process.env.DATABASE_URL || "");
  return { host: url.hostname, port: url.port, database: url.pathname.replace(/^\//, "") };
}

loadEnv();

type Metrics = {
  createdLeadId: number | null;
  queriedLeadId: number | null;
  createdCustomerId: number | null;
  directCustomerId: number | null;
  createdPrimaryContactId: number | null;
  createdSecondaryContactId: number | null;
  finalPrimaryContactId: number | null;
  leadLookupAfterCreate: boolean;
  customerLookupAfterConvert: boolean;
  contactLookupAfterCreate: boolean;
  customerCount: number;
  contactCount: number;
  primaryContactCount: number;
  partialTransactionCount: number;
  unconfirmedWriteCount: number;
  duplicateExecutionCount: number;
};

async function main() {
  const { parseFeishuIntent } = await import("../lib/im/feishu-parser");
  const { executeWriteIntent } = await import("../lib/im/feishu-write-executor");
  const { dryRunFeishuRouting } = await import("../lib/im/feishu-handler");
  const customerFlow = await import("../lib/services/customer-flow-service");
  const { validateUpdateLeadBeforeConfirmation, executeUpdateLead } = await import("../lib/im/feishu-lead-update");
  const prisma = (await import("../lib/prisma")).default;
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const numericSuffix = stamp.replace(/\D/g, "").slice(-4).padStart(4, "0");
  const leadCompany = `FEISHU_E2E_${stamp}_极光宠物食品`;
  const directCustomerCompany = `FEISHU_E2E_${stamp}_星河贸易`;
  const secondaryName = "Lisa Wang";
  const senderId = "feishu-e2e-user";
  const chatId = "feishu-e2e-chat";
  const metrics: Metrics = {
    createdLeadId: null,
    queriedLeadId: null,
    createdCustomerId: null,
    directCustomerId: null,
    createdPrimaryContactId: null,
    createdSecondaryContactId: null,
    finalPrimaryContactId: null,
    leadLookupAfterCreate: false,
    customerLookupAfterConvert: false,
    contactLookupAfterCreate: false,
    customerCount: 0,
    contactCount: 0,
    primaryContactCount: 0,
    partialTransactionCount: 0,
    unconfirmedWriteCount: 0,
    duplicateExecutionCount: 0,
  };

  console.log(`Runtime DB: ${JSON.stringify(publicDbTarget())}`);

  const unconfirmed = await dryRunFeishuRouting(`把线索${leadCompany}转成客户。`);
  metrics.unconfirmedWriteCount += unconfirmed.wouldExecute ? 1 : 0;

  const createLeadText = `帮我新增一条加拿大客户线索，公司叫${leadCompany}，联系人Anna Lee，邮箱anna.${stamp}@example.invalid，电话+1 604 9${numericSuffix}，他们需要10公斤和15公斤宠物食品四边封袋。`;
  const createLeadParsed = parseFeishuIntent(createLeadText);
  assert(createLeadParsed.intent === "CREATE_LEAD", `create lead routed to ${createLeadParsed.intent}`);
  assert(createLeadParsed.parameters.country, "create lead country missing");
  assert(createLeadParsed.parameters.requirement, "create lead requirement missing");
  assert(createLeadParsed.parameters.phone, "create lead phone missing");
  const createLead = await executeWriteIntent(createLeadParsed, senderId, chatId);
  assert(createLead.success && createLead.entityId, `create lead failed: ${createLead.message}`);
  metrics.createdLeadId = createLead.entityId;

  const leadLookup = await customerFlow.resolveLeadReference({ companyName: leadCompany });
  assert(leadLookup.kind === "one", `lead lookup failed after create: ${JSON.stringify(leadLookup)}`);
  metrics.leadLookupAfterCreate = true;
  metrics.queriedLeadId = leadLookup.entity.id;

  const updateLeadParsed = parseFeishuIntent(`把线索${leadCompany}的状态改为已联系。`);
  assert(updateLeadParsed.intent === "UPDATE_LEAD", `update lead routed to ${updateLeadParsed.intent}`);
  const updateLeadValidation = await validateUpdateLeadBeforeConfirmation(updateLeadParsed, `e2e-update-lead-${stamp}`);
  assert(updateLeadValidation.success, `update lead validation failed: ${updateLeadValidation.message}`);
  const updateLead = await executeUpdateLead(updateLeadParsed, senderId, `e2e-update-lead-confirm-${stamp}`);
  assert(updateLead.success, `update lead failed: ${updateLead.message}`);

  const convertParsed = parseFeishuIntent(`把线索${leadCompany}转成客户。`);
  assert(convertParsed.intent === "CONVERT_LEAD_TO_CUSTOMER", `convert routed to ${convertParsed.intent}`);
  const convertValidation = await customerFlow.validateConvertLeadToCustomerPlan((convertParsed.parameters as any).leadReference, `e2e-convert-${stamp}`);
  assert(convertValidation.success && convertValidation.plan, `convert validation failed: ${convertValidation.message}`);
  (convertParsed.parameters as any).customerFlowPlan = convertValidation.plan;
  const convert = await executeWriteIntent(convertParsed, senderId, chatId);
  assert(convert.success && convert.entityId, `convert failed: ${convert.message}`);
  metrics.createdCustomerId = convert.entityId;

  const customerLookup = await customerFlow.resolveCustomerReference({ companyName: leadCompany });
  assert(customerLookup.kind === "one", `customer lookup failed after convert: ${JSON.stringify(customerLookup)}`);
  metrics.customerLookupAfterConvert = true;
  const autoContacts = await prisma.contact.findMany({ where: { customerId: metrics.createdCustomerId } });
  assert(autoContacts.length === 1 && autoContacts[0].isPrimary, "auto primary contact missing after convert");
  metrics.createdPrimaryContactId = autoContacts[0].id;

  const createContactParsed = parseFeishuIntent(`给客户${leadCompany}新增一个采购联系人${secondaryName}，邮箱lisa.${stamp}@example.invalid，电话+1 202 000 0902，职位是采购经理`);
  assert(createContactParsed.intent === "CREATE_CONTACT", `create contact routed to ${createContactParsed.intent}`);
  const createContactValidation = await customerFlow.validateCreateContactPlan(
    (createContactParsed.parameters as any).customerReference,
    (createContactParsed.parameters as any).contactInput,
    `e2e-create-contact-${stamp}`,
  );
  assert(createContactValidation.success && createContactValidation.plan, `create contact validation failed: ${createContactValidation.message}`);
  (createContactParsed.parameters as any).customerFlowPlan = createContactValidation.plan;
  const createContact = await executeWriteIntent(createContactParsed, senderId, chatId);
  assert(createContact.success && createContact.entityId, `create contact failed: ${createContact.message}`);
  metrics.createdSecondaryContactId = createContact.entityId;
  metrics.contactLookupAfterCreate = !!(await prisma.contact.findUnique({ where: { id: createContact.entityId } }));

  const updateContactParsed = parseFeishuIntent(`把联系人ID ${metrics.createdSecondaryContactId}的职位改为高级采购经理。`);
  assert(updateContactParsed.intent === "UPDATE_CONTACT", `update contact routed to ${updateContactParsed.intent}`);
  const updateContactValidation = await customerFlow.validateUpdateContactPlan(
    (updateContactParsed.parameters as any).contactReference,
    undefined,
    (updateContactParsed.parameters as any).contactChanges,
    `e2e-update-contact-${stamp}`,
  );
  assert(updateContactValidation.success && updateContactValidation.plan, `update contact validation failed: ${updateContactValidation.message}`);
  (updateContactParsed.parameters as any).customerFlowPlan = updateContactValidation.plan;
  const updateContact = await executeWriteIntent(updateContactParsed, senderId, chatId);
  assert(updateContact.success, `update contact failed: ${updateContact.message}`);

  const setPrimaryParsed = parseFeishuIntent(`把${leadCompany}的${secondaryName}设为主联系人。`);
  assert(setPrimaryParsed.intent === "SET_PRIMARY_CONTACT", `set primary routed to ${setPrimaryParsed.intent}`);
  const setPrimaryValidation = await customerFlow.validateSetPrimaryContactPlan(
    (setPrimaryParsed.parameters as any).customerReference,
    (setPrimaryParsed.parameters as any).contactReference,
    `e2e-set-primary-${stamp}`,
  );
  assert(setPrimaryValidation.success && setPrimaryValidation.plan, `set primary validation failed: ${setPrimaryValidation.message}`);
  (setPrimaryParsed.parameters as any).customerFlowPlan = setPrimaryValidation.plan;
  const setPrimary = await executeWriteIntent(setPrimaryParsed, senderId, chatId);
  assert(setPrimary.success && setPrimary.entityId, `set primary failed: ${setPrimary.message}`);
  metrics.finalPrimaryContactId = setPrimary.entityId;

  const directCustomerParsed = parseFeishuIntent(`帮我创建一个正式客户，公司叫${directCustomerCompany}，主联系人Michael Chen，美国，邮箱michael.${stamp}@example.invalid，电话+1 202 9${numericSuffix}，业务线C。`);
  assert(directCustomerParsed.intent === "CREATE_CUSTOMER", `direct customer routed to ${directCustomerParsed.intent}`);
  const directCustomerValidation = await customerFlow.validateCreateCustomerPlan((directCustomerParsed.parameters as any).customerInput, `e2e-create-customer-${stamp}`);
  assert(directCustomerValidation.success && directCustomerValidation.plan, `direct customer validation failed: ${directCustomerValidation.message}`);
  (directCustomerParsed.parameters as any).customerFlowPlan = directCustomerValidation.plan;
  const directCustomer = await executeWriteIntent(directCustomerParsed, senderId, chatId);
  assert(directCustomer.success && directCustomer.entityId, `direct customer failed: ${directCustomer.message}`);
  metrics.directCustomerId = directCustomer.entityId;

  const updateCustomerParsed = parseFeishuIntent(`把客户${directCustomerCompany}的等级改为A级，电话改为+1 303 9${numericSuffix}，下周一再跟进。`);
  assert(updateCustomerParsed.intent === "UPDATE_CUSTOMER", `update customer routed to ${updateCustomerParsed.intent}`);
  const changes = (updateCustomerParsed.parameters as any).customerChanges;
  assert(Object.keys(changes).sort().join(",") === "grade,nextFollowUpAt,phone", `unexpected update customer changes: ${Object.keys(changes).join(",")}`);
  const updateCustomerValidation = await customerFlow.validateUpdateCustomerPlan(
    (updateCustomerParsed.parameters as any).customerReference,
    changes,
    `e2e-update-customer-${stamp}`,
  );
  assert(updateCustomerValidation.success && updateCustomerValidation.plan, `update customer validation failed: ${updateCustomerValidation.message}`);
  (updateCustomerParsed.parameters as any).customerFlowPlan = updateCustomerValidation.plan;
  const updateCustomer = await executeWriteIntent(updateCustomerParsed, senderId, chatId);
  assert(updateCustomer.success, `update customer failed: ${updateCustomer.message}`);

  metrics.customerCount = await prisma.customer.count({ where: { company: leadCompany } });
  metrics.contactCount = await prisma.contact.count({ where: { customerId: metrics.createdCustomerId! } });
  metrics.primaryContactCount = await prisma.contact.count({ where: { customerId: metrics.createdCustomerId!, isPrimary: true } });
  const convertedLead = await prisma.lead.findUnique({ where: { id: metrics.createdLeadId! } });
  metrics.partialTransactionCount += convertedLead?.convertedCustomerId === metrics.createdCustomerId ? 0 : 1;

  assert(metrics.customerCount === 1, `Customer Count expected 1 got ${metrics.customerCount}`);
  assert(metrics.contactCount === 2, `Contact Count expected 2 got ${metrics.contactCount}`);
  assert(metrics.primaryContactCount === 1, `Primary Contact Count expected 1 got ${metrics.primaryContactCount}`);
  assert(metrics.partialTransactionCount === 0, "partial transaction detected");
  assert(metrics.unconfirmedWriteCount === 0, "unconfirmed write detected");
  assert(metrics.duplicateExecutionCount === 0, "duplicate execution detected");

  console.log(`Created Lead ID: ${metrics.createdLeadId}`);
  console.log(`Queried Lead ID: ${metrics.queriedLeadId}`);
  console.log(`Created Customer ID: ${metrics.createdCustomerId}`);
  console.log(`Direct Created Customer ID: ${metrics.directCustomerId}`);
  console.log(`Created Primary Contact ID: ${metrics.createdPrimaryContactId}`);
  console.log(`Created Secondary Contact ID: ${metrics.createdSecondaryContactId}`);
  console.log(`Final Primary Contact ID: ${metrics.finalPrimaryContactId}`);
  console.log(`Lead Lookup After Create: ${metrics.leadLookupAfterCreate}`);
  console.log(`Customer Lookup After Convert: ${metrics.customerLookupAfterConvert}`);
  console.log(`Contact Lookup After Create: ${metrics.contactLookupAfterCreate}`);
  console.log(`Customer Count: ${metrics.customerCount}`);
  console.log(`Contact Count: ${metrics.contactCount}`);
  console.log(`Primary Contact Count: ${metrics.primaryContactCount}`);
  console.log(`Partial Transaction Count: ${metrics.partialTransactionCount}`);
  console.log(`Unconfirmed Write Count: ${metrics.unconfirmedWriteCount}`);
  console.log(`Duplicate Execution Count: ${metrics.duplicateExecutionCount}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
  try {
    const prisma = (await import("../lib/prisma")).default;
    await prisma.$disconnect();
  } catch {}
});
