# DNS Setup Guide for GoDaddy

## Domain: mybackends.xyz

## EC2 IP: 13.127.190.28

## Required DNS Records

You need to add the following DNS records in your GoDaddy domain management panel:

### 1. Main Domain Records

| Type | Name | Value         | TTL |
| ---- | ---- | ------------- | --- |
| A    | @    | 13.127.190.28 | 600 |
| A    | www  | 13.127.190.28 | 600 |

### 2. Subdomain Records

| Type | Name      | Value         | TTL |
| ---- | --------- | ------------- | --- |
| A    | guest     | 13.127.190.28 | 600 |
| A    | driver    | 13.127.190.28 | 600 |
| A    | frontdesk | 13.127.190.28 | 600 |
| A    | admin     | 13.127.190.28 | 600 |
| A    | super     | 13.127.190.28 | 600 |
| A    | api       | 13.127.190.28 | 600 |

## How to Add DNS Records in GoDaddy

### Step 1: Access GoDaddy Domain Management

1. Log in to your GoDaddy account
2. Go to "My Products" → "Domains"
3. Find `mybackends.xyz` and click "Manage"

### Step 2: Access DNS Management

1. In the domain management page, find "DNS" section
2. Click "Manage DNS"

### Step 3: Add A Records

1. Click "Add" button
2. Select "A" as the record type
3. For each subdomain:
   - **Name**: Enter the subdomain name (e.g., `guest`, `driver`, etc.)
   - **Value**: Enter `13.127.190.28`
   - **TTL**: Set to 600 seconds (10 minutes)
4. Click "Save"

### Step 4: Add Main Domain Records

1. Add an A record for the root domain:
   - **Name**: Leave empty or enter `@`
   - **Value**: `13.127.190.28`
   - **TTL**: 600 seconds
2. Add an A record for www:
   - **Name**: `www`
   - **Value**: `13.127.190.28`
   - **TTL**: 600 seconds

## Verification

After adding the DNS records, you can verify them using:

```bash
# Check DNS propagation
nslookup guest.mybackends.xyz
nslookup driver.mybackends.xyz
nslookup frontdesk.mybackends.xyz
nslookup admin.mybackends.xyz
nslookup super.mybackends.xyz
nslookup api.mybackends.xyz
```

## Expected Results

All subdomains should resolve to `13.127.190.28`:

```
guest.mybackends.xyz -> 13.127.190.28
driver.mybackends.xyz -> 13.127.190.28
frontdesk.mybackends.xyz -> 13.127.190.28
admin.mybackends.xyz -> 13.127.190.28
super.mybackends.xyz -> 13.127.190.28
api.mybackends.xyz -> 13.127.190.28
```

## DNS Propagation Time

- **TTL**: 600 seconds (10 minutes)
- **Full propagation**: Usually 24-48 hours
- **Testing**: You can test immediately, but changes may take time to propagate globally

## Troubleshooting

### If DNS doesn't resolve:

1. Wait for DNS propagation (up to 48 hours)
2. Check if the A records are correctly added
3. Verify the IP address is correct
4. Clear your browser DNS cache
5. Try using a different DNS server (8.8.8.8 or 1.1.1.1)

### If you get SSL errors:

- This is expected until you install SSL certificates
- The nginx configuration will redirect HTTP to HTTPS
- You'll need to set up SSL certificates later

## Next Steps

After DNS is configured:

1. Deploy the nginx configuration
2. Install SSL certificates (Let's Encrypt recommended)
3. Test all applications
4. Update your application configurations to use the new domains
