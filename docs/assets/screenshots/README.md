# Screenshots

Naming convention and instructions for project screenshots used in documentation.

## Naming Convention

All screenshots must follow this format:

```
{module}-{view}-{variant}.png
```

### Components

| Part | Description | Examples |
|------|-------------|----------|
| `{module}` | Feature module name | `leads`, `customers`, `orders`, `dashboard`, `email`, `ai-settings` |
| `{view}` | Screen or view type | `list`, `detail`, `form`, `modal`, `chart` |
| `{variant}` | Optional variant descriptor | `filtered`, `empty`, `mobile`, `dark` |

### Examples

```
dashboard-overview.png
leads-list.png
leads-detail.png
leads-form.png
customers-list-filtered.png
customers-detail.png
orders-list.png
orders-form.png
email-inbox.png
ai-settings.png
login-empty.png
login-error.png
reports-funnel.png
```

## Screenshot Requirements

### Resolution
- **Minimum width:** 1280px
- **Preferred width:** 1920px
- **Format:** PNG (lossless for UI screenshots)
- **Max file size:** 500 KB (compress with tools like TinyPNG before committing)

### Content Guidelines
1. **Use virtual/test data only** -- never use real customer information
2. **Use the default test account** (`admin@example.com`) for login screens
3. **Show representative content** -- enough data to demonstrate the feature, not empty states by default
4. **Crop appropriately** -- include the relevant UI area, not the entire desktop
5. **No personal information** -- no real names, emails, phone numbers, or addresses
6. **No browser chrome** -- crop out the browser address bar and tabs unless relevant

### Data shown in screenshots
| Field | Use |
|-------|-----|
| Company names | "Acme Corporation", "Globex Industries", "Initech" |
| Contact names | "John Smith", "Jane Doe", "Alice Johnson" |
| Emails | "john@acme.com", "jane@globex.com" |
| Phone numbers | "+1-555-0100", "+44-20-7946-0958" |
| Amounts | Round numbers like $1,000, $12,500 |

## Adding New Screenshots

1. Create the screenshot following the naming convention above
2. Save it in this directory (`docs/assets/screenshots/`)
3. Reference it from the relevant documentation using relative paths:
   ```markdown
   ![Leads List](../assets/screenshots/leads-list.png)
   ```
4. Add a brief alt text describing what the screenshot shows
5. Ensure the file is under 500 KB

## Replacing Screenshots

When updating a screenshot to reflect UI changes:
1. Use the same filename to automatically update all references
2. Verify the new screenshot still meets the resolution and content guidelines
3. Check that no documentation links are broken

## Automation

The `docs-check` CI workflow scans documentation for sensitive data, local paths, and competitor names. Screenshots are not scanned automatically -- review manually before committing.
