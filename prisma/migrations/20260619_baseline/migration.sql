Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MANUAL_OUTREACH', 'WEBSITE', 'FACEBOOK', 'TIKTOK', 'WHATSAPP', 'EMAIL', 'REFERRAL', 'EXHIBITION', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'REQUIREMENT_CONFIRMING', 'QUOTING', 'NEGOTIATING', 'QUALIFIED', 'WON', 'LOST', 'DORMANT');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "LeadGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('IMPORTER', 'DISTRIBUTOR', 'MANUFACTURER', 'TRADER', 'BRAND_OWNER', 'RETAILER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'POTENTIAL', 'INACTIVE', 'WON', 'LOST', 'BLACKLIST');

-- CreateEnum
CREATE TYPE "CustomerLifecycleStage" AS ENUM ('POTENTIAL', 'INTENT', 'FIRST_DEAL', 'REPEAT_DEAL', 'VIP');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('REQUIREMENT_CONFIRMING', 'QUOTING', 'SAMPLE_TESTING', 'WAITING_FEEDBACK', 'NEGOTIATING', 'WON', 'LOST', 'PAUSED');

-- CreateEnum
CREATE TYPE "FollowUpMethod" AS ENUM ('EMAIL', 'WHATSAPP', 'PHONE', 'MEETING', 'VIDEO_CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FOLLOW_UP', 'CALL', 'MEETING', 'QUOTE', 'SAMPLE', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'WAITING_FEEDBACK', 'REVISED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'CNY');

-- CreateEnum
CREATE TYPE "TemplateScene" AS ENUM ('FIRST_REPLY', 'QUOTE_CONFIRMATION', 'QUOTE_FOLLOW_UP', 'SAMPLE_FOLLOW_UP', 'NO_REPLY_FOLLOW_UP', 'PRICE_NEGOTIATION', 'ORDER_CONFIRMATION', 'AFTER_SALES', 'OTHER');

-- CreateEnum
CREATE TYPE "TemplateLanguage" AS ENUM ('EN', 'CN', 'BOTH');

-- CreateEnum
CREATE TYPE "AIAnalysisTargetType" AS ENUM ('LEAD', 'CUSTOMER', 'PROJECT', 'FOLLOW_UP', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "ExternalSourceType" AS ENUM ('WEBSITE_FORM', 'FACEBOOK_FORM', 'TIKTOK_MANUAL', 'N8N', 'AI_MARKETING_SYSTEM', 'WHATSAPP_MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('SUCCESS', 'FAILED', 'UNAUTHORIZED', 'DUPLICATE', 'VALIDATION_ERROR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('QUOTE', 'CONTRACT', 'ARTWORK', 'SAMPLE_PHOTO', 'PRODUCT_SPEC', 'PACKING_REQUIREMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentRelatedType" AS ENUM ('CUSTOMER', 'PROJECT', 'QUOTE', 'ORDER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TT', 'LC', 'PAYPAL', 'WESTERN_UNION', 'CASH', 'OTHER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES',
    "tenantId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessLine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "website" TEXT,
    "mainProducts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL_OUTREACH',
    "sourceWebsite" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "temperature" "LeadTemperature" NOT NULL DEFAULT 'WARM',
    "grade" "LeadGrade" NOT NULL DEFAULT 'C',
    "requirement" TEXT,
    "interestProducts" TEXT,
    "inquiryContent" TEXT,
    "budget" DECIMAL(12,2),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "expectedClosing" TIMESTAMP(3),
    "nextFollowUp" TIMESTAMP(3),
    "remark" TEXT,
    "businessLineId" INTEGER NOT NULL,
    "convertedCustomerId" INTEGER,
    "ownerId" INTEGER,
    "ownerName" TEXT,
    "tenantId" INTEGER,
    "aiScore" INTEGER,
    "aiSummary" TEXT,
    "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'note',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "address" TEXT,
    "industry" TEXT,
    "customerType" "CustomerType" NOT NULL DEFAULT 'UNKNOWN',
    "customerStatus" "CustomerStatus" NOT NULL DEFAULT 'POTENTIAL',
    "lifecycleStage" "CustomerLifecycleStage" NOT NULL DEFAULT 'POTENTIAL',
    "leadGrade" "LeadGrade" NOT NULL DEFAULT 'C',
    "source" "LeadSource",
    "sourceWebsite" TEXT,
    "remark" TEXT,
    "aiScore" INTEGER,
    "aiIntentLevel" TEXT,
    "lastAiActionAt" TIMESTAMP(3),
    "ownerId" INTEGER,
    "ownerName" TEXT,
    "poolEnteredAt" TIMESTAMP(3),
    "poolReason" TEXT,
    "businessLineId" INTEGER NOT NULL,
    "tenantId" INTEGER,
    "shortName" TEXT,
    "region" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "companySize" TEXT,
    "rating" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "purchaseIntent" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "dealProbability" INTEGER,
    "expectedDealValue" DECIMAL(12,2),
    "expectedCloseDate" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "customCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "wechat" TEXT,
    "linkedin" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" INTEGER,
    "firstName" TEXT,
    "lastName" TEXT,
    "nickname" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "secondaryEmail" TEXT,
    "mobile" TEXT,
    "phoneCountryCode" TEXT,
    "preferredContactMethod" TEXT,
    "preferredLanguage" TEXT,
    "timezone" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerActivity" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'note',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'REQUIREMENT_CONFIRMING',
    "productCategory" TEXT,
    "productName" TEXT,
    "specs" TEXT,
    "quantity" TEXT,
    "usage" TEXT,
    "targetMarket" TEXT,
    "specialRequirements" TEXT,
    "amount" DECIMAL(12,2),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "remark" TEXT,
    "businessLineId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "leadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" SERIAL NOT NULL,
    "method" "FollowUpMethod" NOT NULL DEFAULT 'EMAIL',
    "content" TEXT NOT NULL,
    "customerFeedback" TEXT,
    "nextAction" TEXT,
    "followUpDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextFollowUpDate" TIMESTAMP(3),
    "remark" TEXT,
    "leadId" INTEGER,
    "customerId" INTEGER,
    "projectId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" SERIAL NOT NULL,
    "quoteNo" TEXT NOT NULL,
    "quoteTitle" TEXT,
    "productName" TEXT,
    "specs" TEXT,
    "quantity" TEXT,
    "unitPrice" DECIMAL(12,2),
    "totalPrice" DECIMAL(12,2),
    "exchangeRate" DECIMAL(12,6),
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "paymentTerms" TEXT,
    "deliveryTime" TEXT,
    "validDays" INTEGER,
    "deliveryTerm" TEXT,
    "shippingTerm" TEXT,
    "validUntil" TIMESTAMP(3),
    "content" TEXT,
    "remarks" TEXT,
    "terms" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "leadId" INTEGER,
    "customerId" INTEGER,
    "projectId" INTEGER,
    "customerContactId" INTEGER,
    "tenantId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'FOLLOW_UP',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "leadId" INTEGER,
    "customerId" INTEGER,
    "projectId" INTEGER,
    "quoteId" INTEGER,
    "orderId" INTEGER,
    "ownerId" INTEGER,
    "ownerName" TEXT,
    "tenantId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "englishKeywords" TEXT,
    "commonSpecs" TEXT,
    "application" TEXT,
    "targetMarket" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessLineId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTemplate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "scene" "TemplateScene" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "language" "TemplateLanguage" NOT NULL DEFAULT 'EN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "businessLineId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'task',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "customerId" INTEGER,
    "leadId" INTEGER,
    "projectId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesGoal" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL(12,2) NOT NULL,
    "currentValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" SERIAL NOT NULL,
    "targetType" "AIAnalysisTargetType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "requirementSummary" TEXT,
    "extractedRequirements" TEXT,
    "qualificationLevel" TEXT,
    "intentLevel" TEXT,
    "buyerTypeGuess" TEXT,
    "riskPoints" TEXT,
    "missingInfo" TEXT,
    "suggestedQuestions" TEXT,
    "nextAction" TEXT,
    "whatsappReply" TEXT,
    "emailSubject" TEXT,
    "emailReply" TEXT,
    "internalSalesNote" TEXT,
    "rawInput" TEXT,
    "rawOutput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sourceType" "ExternalSourceType" NOT NULL,
    "businessLineId" INTEGER,
    "defaultSource" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "defaultLeadGrade" "LeadGrade" NOT NULL DEFAULT 'C',
    "defaultPriority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "apiKeyHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoAnalyze" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" SERIAL NOT NULL,
    "externalSourceId" INTEGER,
    "sourceCode" TEXT,
    "status" "WebhookStatus" NOT NULL,
    "requestBody" TEXT,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "createdLeadId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "productId" INTEGER,
    "itemName" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" DECIMAL(12,2),
    "unit" TEXT,
    "unitPrice" DECIMAL(12,2),
    "totalPrice" DECIMAL(12,2),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderNo" TEXT NOT NULL,
    "orderTitle" TEXT,
    "customerId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "quoteId" INTEGER,
    "contactId" INTEGER,
    "businessLineId" INTEGER,
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2),
    "exchangeRate" DECIMAL(12,6),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "paymentTerm" TEXT,
    "deliveryTerm" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "tenantId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER,
    "itemName" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" DECIMAL(12,2),
    "unit" TEXT,
    "unitPrice" DECIMAL(12,2),
    "totalPrice" DECIMAL(12,2),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "notes" TEXT,
    "relatedType" "DocumentRelatedType" NOT NULL,
    "relatedId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "orderId" INTEGER,
    "customerId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'TT',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "imapHost" TEXT,
    "imapPort" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" SERIAL NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "fromAddr" TEXT NOT NULL,
    "toAddr" TEXT NOT NULL,
    "ccAddr" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "customerId" INTEGER,
    "contactId" INTEGER,
    "leadId" INTEGER,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'CUSTOM',
    "emailAddress" TEXT NOT NULL,
    "imapHost" TEXT,
    "imapPort" INTEGER,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "oauthToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "tenantId" INTEGER,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "threadId" INTEGER,
    "direction" TEXT NOT NULL,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "fromAddr" TEXT NOT NULL,
    "toAddr" TEXT NOT NULL,
    "ccAddr" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "leadId" INTEGER,
    "customerId" INTEGER,
    "contactId" INTEGER,
    "quoteId" INTEGER,
    "orderId" INTEGER,
    "tenantId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "tenantId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConfig" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'OPENAI_COMPATIBLE',
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "visionBaseUrl" TEXT,
    "visionApiKey" TEXT,
    "visionModel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMPlatform" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "appId" TEXT,
    "appSecret" TEXT,
    "encryptKey" TEXT,
    "verifyToken" TEXT,
    "botToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IMPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMUser" (
    "id" SERIAL NOT NULL,
    "platformId" INTEGER NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "platformName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IMUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMMessage" (
    "id" SERIAL NOT NULL,
    "platformId" INTEGER NOT NULL,
    "imUserId" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "action" TEXT,
    "actionResult" JSONB,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IMMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSocialProfile" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "contactId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "profileUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSocialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "entityType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'TEXT',
    "description" TEXT,
    "placeholder" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "defaultValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "fieldDefinitionId" INTEGER NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AILog" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "aiOutput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AILog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "fromAddr" TEXT NOT NULL,
    "toAddr" TEXT,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "customerId" INTEGER,
    "leadId" INTEGER,
    "contactId" INTEGER,
    "quoteId" INTEGER,
    "orderId" INTEGER,
    "intent" TEXT,
    "sentiment" TEXT,
    "urgency" TEXT,
    "externalId" TEXT,
    "metadata" JSONB,
    "tenantId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIControlSettings" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "salesAgentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailAgentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappAgentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "followUpAgentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "prospectingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "executionMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "workHoursStart" INTEGER NOT NULL DEFAULT 9,
    "workHoursEnd" INTEGER NOT NULL DEFAULT 18,
    "maxContactsPerDay" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIControlSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPolicyRule" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SOFT',
    "action" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "value" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecutionLog" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "allowed" BOOLEAN NOT NULL,
    "reason" TEXT,
    "mode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLine_name_key" ON "BusinessLine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLine_code_key" ON "BusinessLine"("code");

-- CreateIndex
CREATE INDEX "Lead_businessLineId_idx" ON "Lead"("businessLineId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_temperature_idx" ON "Lead"("temperature");

-- CreateIndex
CREATE INDEX "Lead_grade_idx" ON "Lead"("grade");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUp_idx" ON "Lead"("nextFollowUp");

-- CreateIndex
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_createdAt_idx" ON "LeadActivity"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_ownerId_idx" ON "Customer"("ownerId");

-- CreateIndex
CREATE INDEX "Customer_businessLineId_idx" ON "Customer"("businessLineId");

-- CreateIndex
CREATE INDEX "Customer_customerStatus_idx" ON "Customer"("customerStatus");

-- CreateIndex
CREATE INDEX "Customer_customerType_idx" ON "Customer"("customerType");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Contact_customerId_idx" ON "Contact"("customerId");

-- CreateIndex
CREATE INDEX "CustomerActivity_customerId_idx" ON "CustomerActivity"("customerId");

-- CreateIndex
CREATE INDEX "CustomerActivity_createdAt_idx" ON "CustomerActivity"("createdAt");

-- CreateIndex
CREATE INDEX "Project_businessLineId_idx" ON "Project"("businessLineId");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "FollowUp_leadId_idx" ON "FollowUp"("leadId");

-- CreateIndex
CREATE INDEX "FollowUp_customerId_idx" ON "FollowUp"("customerId");

-- CreateIndex
CREATE INDEX "FollowUp_projectId_idx" ON "FollowUp"("projectId");

-- CreateIndex
CREATE INDEX "FollowUp_followUpDate_idx" ON "FollowUp"("followUpDate");

-- CreateIndex
CREATE INDEX "FollowUp_nextFollowUpDate_idx" ON "FollowUp"("nextFollowUpDate");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNo_key" ON "Quote"("quoteNo");

-- CreateIndex
CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_projectId_idx" ON "Quote"("projectId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_quoteNo_idx" ON "Quote"("quoteNo");

-- CreateIndex
CREATE INDEX "Quote_tenantId_idx" ON "Quote"("tenantId");

-- CreateIndex
CREATE INDEX "Task_leadId_idx" ON "Task"("leadId");

-- CreateIndex
CREATE INDEX "Task_customerId_idx" ON "Task"("customerId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");

-- CreateIndex
CREATE INDEX "Product_businessLineId_idx" ON "Product"("businessLineId");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "FollowUpTemplate_scene_idx" ON "FollowUpTemplate"("scene");

-- CreateIndex
CREATE INDEX "FollowUpTemplate_language_idx" ON "FollowUpTemplate"("language");

-- CreateIndex
CREATE INDEX "FollowUpTemplate_isActive_idx" ON "FollowUpTemplate"("isActive");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_idx" ON "ActivityLog"("entityType");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_startTime_idx" ON "CalendarEvent"("startTime");

-- CreateIndex
CREATE INDEX "CalendarEvent_eventType_idx" ON "CalendarEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "SalesGoal_year_month_metricType_key" ON "SalesGoal"("year", "month", "metricType");

-- CreateIndex
CREATE INDEX "AIAnalysis_targetType_idx" ON "AIAnalysis"("targetType");

-- CreateIndex
CREATE INDEX "AIAnalysis_targetId_idx" ON "AIAnalysis"("targetId");

-- CreateIndex
CREATE INDEX "AIAnalysis_createdAt_idx" ON "AIAnalysis"("createdAt");

-- CreateIndex
CREATE INDEX "AIAnalysis_qualificationLevel_idx" ON "AIAnalysis"("qualificationLevel");

-- CreateIndex
CREATE INDEX "AIAnalysis_intentLevel_idx" ON "AIAnalysis"("intentLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSource_code_key" ON "ExternalSource"("code");

-- CreateIndex
CREATE INDEX "ExternalSource_code_idx" ON "ExternalSource"("code");

-- CreateIndex
CREATE INDEX "ExternalSource_isActive_idx" ON "ExternalSource"("isActive");

-- CreateIndex
CREATE INDEX "WebhookLog_externalSourceId_idx" ON "WebhookLog"("externalSourceId");

-- CreateIndex
CREATE INDEX "WebhookLog_status_idx" ON "WebhookLog"("status");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_projectId_idx" ON "Order"("projectId");

-- CreateIndex
CREATE INDEX "Order_quoteId_idx" ON "Order"("quoteId");

-- CreateIndex
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");

-- CreateIndex
CREATE INDEX "Order_orderNo_idx" ON "Order"("orderNo");

-- CreateIndex
CREATE INDEX "Order_businessLineId_idx" ON "Order"("businessLineId");

-- CreateIndex
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "Document_relatedType_relatedId_idx" ON "Document"("relatedType", "relatedId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNo_idx" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailConfig_name_key" ON "EmailConfig"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Email_messageId_key" ON "Email"("messageId");

-- CreateIndex
CREATE INDEX "Email_customerId_idx" ON "Email"("customerId");

-- CreateIndex
CREATE INDEX "Email_leadId_idx" ON "Email"("leadId");

-- CreateIndex
CREATE INDEX "Email_direction_idx" ON "Email"("direction");

-- CreateIndex
CREATE INDEX "Email_createdAt_idx" ON "Email"("createdAt");

-- CreateIndex
CREATE INDEX "EmailAccount_tenantId_idx" ON "EmailAccount"("tenantId");

-- CreateIndex
CREATE INDEX "EmailAccount_userId_idx" ON "EmailAccount"("userId");

-- CreateIndex
CREATE INDEX "EmailAccount_emailAddress_idx" ON "EmailAccount"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_messageId_key" ON "EmailMessage"("messageId");

-- CreateIndex
CREATE INDEX "EmailMessage_accountId_idx" ON "EmailMessage"("accountId");

-- CreateIndex
CREATE INDEX "EmailMessage_threadId_idx" ON "EmailMessage"("threadId");

-- CreateIndex
CREATE INDEX "EmailMessage_direction_idx" ON "EmailMessage"("direction");

-- CreateIndex
CREATE INDEX "EmailMessage_leadId_idx" ON "EmailMessage"("leadId");

-- CreateIndex
CREATE INDEX "EmailMessage_customerId_idx" ON "EmailMessage"("customerId");

-- CreateIndex
CREATE INDEX "EmailMessage_contactId_idx" ON "EmailMessage"("contactId");

-- CreateIndex
CREATE INDEX "EmailMessage_isRead_idx" ON "EmailMessage"("isRead");

-- CreateIndex
CREATE INDEX "EmailMessage_createdAt_idx" ON "EmailMessage"("createdAt");

-- CreateIndex
CREATE INDEX "EmailThread_accountId_idx" ON "EmailThread"("accountId");

-- CreateIndex
CREATE INDEX "EmailThread_lastMessageAt_idx" ON "EmailThread"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "IMPlatform_name_key" ON "IMPlatform"("name");

-- CreateIndex
CREATE INDEX "IMUser_platformId_idx" ON "IMUser"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "IMUser_platformId_platformUserId_key" ON "IMUser"("platformId", "platformUserId");

-- CreateIndex
CREATE INDEX "IMMessage_createdAt_idx" ON "IMMessage"("createdAt");

-- CreateIndex
CREATE INDEX "IMMessage_platformId_idx" ON "IMMessage"("platformId");

-- CreateIndex
CREATE INDEX "ContactSocialProfile_contactId_idx" ON "ContactSocialProfile"("contactId");

-- CreateIndex
CREATE INDEX "ContactSocialProfile_tenantId_idx" ON "ContactSocialProfile"("tenantId");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_tenantId_entityType_idx" ON "CustomFieldDefinition"("tenantId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_tenantId_entityType_key_key" ON "CustomFieldDefinition"("tenantId", "entityType", "key");

-- CreateIndex
CREATE INDEX "CustomFieldValue_entityType_entityId_idx" ON "CustomFieldValue"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_tenantId_idx" ON "CustomFieldValue"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_fieldDefinitionId_entityType_entityId_key" ON "CustomFieldValue"("fieldDefinitionId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AILog_entityType_entityId_idx" ON "AILog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AILog_createdAt_idx" ON "AILog"("createdAt");

-- CreateIndex
CREATE INDEX "Message_customerId_idx" ON "Message"("customerId");

-- CreateIndex
CREATE INDEX "Message_leadId_idx" ON "Message"("leadId");

-- CreateIndex
CREATE INDEX "Message_channel_idx" ON "Message"("channel");

-- CreateIndex
CREATE INDEX "Message_direction_idx" ON "Message"("direction");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIControlSettings_tenantId_key" ON "AIControlSettings"("tenantId");

-- CreateIndex
CREATE INDEX "AIPolicyRule_tenantId_idx" ON "AIPolicyRule"("tenantId");

-- CreateIndex
CREATE INDEX "AIExecutionLog_tenantId_idx" ON "AIExecutionLog"("tenantId");

-- CreateIndex
CREATE INDEX "AIExecutionLog_actionType_idx" ON "AIExecutionLog"("actionType");

-- CreateIndex
CREATE INDEX "AIExecutionLog_allowed_idx" ON "AIExecutionLog"("allowed");

-- CreateIndex
CREATE INDEX "AIExecutionLog_createdAt_idx" ON "AIExecutionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedCustomerId_fkey" FOREIGN KEY ("convertedCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerActivity" ADD CONSTRAINT "CustomerActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTemplate" ADD CONSTRAINT "FollowUpTemplate_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSource" ADD CONSTRAINT "ExternalSource_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_externalSourceId_fkey" FOREIGN KEY ("externalSourceId") REFERENCES "ExternalSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMUser" ADD CONSTRAINT "IMUser_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "IMPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMMessage" ADD CONSTRAINT "IMMessage_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "IMPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMMessage" ADD CONSTRAINT "IMMessage_imUserId_fkey" FOREIGN KEY ("imUserId") REFERENCES "IMUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSocialProfile" ADD CONSTRAINT "ContactSocialProfile_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "CustomFieldDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

