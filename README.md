# Restaurant Digital Wallet

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Full-featured loyalty card system with Apple Wallet, Google Wallet integration and Syrve (iiko) POS system integration.

[📖 Documentation](#documentation) | [🐛 Report Bug](https://github.com/Sneckpro/sneksy/issues)

## Features

- Customer registration via web form
- Automatic card generation for Apple Wallet and Google Wallet
- Tiered discount system:
  - On registration: **3%**
  - After $400 spent: **5%**
  - After $1,000 spent: **10%**
  - After $2,000 spent: **15%**
- Admin panel for transaction management
- QR codes for quick registration
- User and transaction database
- Automatic card updates when discount level changes

## Technologies

- **Backend**: Node.js, Express.js
- **Database**: SQLite (easy to migrate to PostgreSQL)
- **Apple Wallet**: passkit-generator
- **Google Wallet**: Google Wallet API
- **Frontend**: Vanilla JavaScript, CSS

## Installation

### 1. Install Dependencies

```bash
cd wallet_app
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Fill in the variables in `.env`:

```env
PORT=3000
DB_PATH=./database.sqlite

# Apple Wallet Configuration
APPLE_TEAM_IDENTIFIER=YOUR_TEAM_ID
APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourrestaurant.loyalty
APPLE_WWDR_CERTIFICATE_PATH=./certs/WWDR.pem
APPLE_SIGNER_CERTIFICATE_PATH=./certs/signerCert.pem
APPLE_SIGNER_KEY_PATH=./certs/signerKey.pem
APPLE_SIGNER_KEY_PASSPHRASE=your_passphrase

# Google Wallet Configuration
GOOGLE_ISSUER_ID=YOUR_ISSUER_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./certs/google-service-account.json

# Restaurant Configuration
RESTAURANT_NAME=Your Restaurant
RESTAURANT_DESCRIPTION=Loyalty Program
BASE_URL=http://localhost:3000
```

### 3. Apple Wallet Setup

To work with Apple Wallet you need:

1. **Apple Developer Account** (paid, $99/year)
2. **Create Pass Type ID**:
   - Go to [Apple Developer Portal](https://developer.apple.com/account)
   - Certificates, Identifiers & Profiles → Identifiers → Pass Type IDs
   - Create a new Pass Type ID (e.g., `pass.com.yourrestaurant.loyalty`)

3. **Create certificates**:
   ```bash
   mkdir certs
   ```

4. **Obtain certificates**:
   - **WWDR Certificate**: Download from [Apple PKI](https://www.apple.com/certificateauthority/)
   - **Pass Type Certificate**: Create in Apple Developer Portal
   - **Private Key**: Export from Keychain Access

5. **Convert certificates to PEM format**:
   ```bash
   # WWDR Certificate
   openssl x509 -inform DER -outform PEM -in AppleWWDRCA.cer -out ./certs/WWDR.pem

   # Pass Certificate
   openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out ./certs/signerCert.pem
   openssl pkcs12 -in Certificates.p12 -nocerts -out ./certs/signerKey.pem
   ```

6. **Create pass model folder**:
   ```bash
   mkdir -p apple-pass-model
   ```

7. **Add pass.json file** to the `apple-pass-model/` folder:
   ```json
   {
     "formatVersion": 1,
     "passTypeIdentifier": "pass.com.yourrestaurant.loyalty",
     "teamIdentifier": "YOUR_TEAM_ID",
     "logoText": "Your Restaurant",
     "description": "Loyalty Program",
     "organizationName": "Your Restaurant"
   }
   ```

8. **Add images** to the `apple-pass-model/` folder:
   - `logo.png` (320x100px)
   - `logo@2x.png` (640x200px)
   - `icon.png` (58x58px)
   - `icon@2x.png` (116x116px)

### 4. Google Wallet Setup

1. **Create a project in Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project

2. **Enable Google Wallet API**:
   - APIs & Services → Enable APIs and Services
   - Search for "Google Wallet API" and enable it

3. **Create Service Account**:
   - IAM & Admin → Service Accounts
   - Create a new Service Account
   - Grant "Google Wallet API Issuer" role

4. **Obtain JSON key**:
   - Create a key for the Service Account
   - Download the JSON file
   - Save as `./certs/google-service-account.json`

5. **Get Issuer ID**:
   - Go to [Google Pay & Wallet Console](https://pay.google.com/business/console)
   - Copy your Issuer ID

6. **Create Loyalty Class** (optional, can be done via API):
   - Create a Loyalty Class in Google Pay & Wallet Console
   - Or launch the app and the class will be created automatically

### 5. Run the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Or standard launch
npm start
```

The application will be available at: http://localhost:3000

## Usage

### For Customers

1. Open http://localhost:3000
2. Fill out the registration form (first name, last name, email, phone)
3. After registration, get links to add the card to Apple Wallet or Google Wallet
4. Add the card to your wallet
5. Present the card with each purchase

### For Administrators

1. Open http://localhost:3000/admin
2. View the list of all registered customers
3. Use search to quickly find a customer
4. Click "Add Purchase" to record a transaction
5. Discount is applied automatically, card updates automatically

### QR Code for Registration

The admin panel has a QR code that can be:
- Printed and placed in the restaurant
- Sent to customers
- Posted on website or social media

## API Endpoints

### Register User
```
POST /api/register
Body: { email, phone, first_name, last_name }
```

### Get User
```
GET /api/user/:id
GET /api/user/card/:serial
```

### Add Transaction
```
POST /api/transaction
Body: { user_id, amount, description }
```

### Get User Transactions
```
GET /api/transactions/:userId
```

### Get All Users
```
GET /api/users
```

### Get Registration QR Code
```
GET /api/qr/registration
```

## Project Structure

```
wallet_app/
├── server.js                 # Main server
├── database.js              # Database operations
├── apple-wallet.js          # Apple Wallet pass generation
├── google-wallet.js         # Google Wallet pass generation
├── package.json             # Dependencies
├── .env                     # Configuration (not in git)
├── .env.example            # Configuration example
├── certs/                   # Certificates (not in git)
│   ├── WWDR.pem
│   ├── signerCert.pem
│   ├── signerKey.pem
│   └── google-service-account.json
├── apple-pass-model/        # Apple Pass template
│   ├── pass.json
│   ├── logo.png
│   └── icon.png
├── public/                  # Frontend files
│   ├── index.html          # Registration form
│   └── admin.html          # Admin panel
├── passes/                  # Generated passes (not in git)
└── database.sqlite         # Database (not in git)
```

## Database

### users Table
- `id` - User UUID
- `email` - Email (unique)
- `phone` - Phone number
- `first_name` - First name
- `last_name` - Last name
- `total_spent` - Total purchase amount
- `discount_percent` - Current discount (3%, 5%, 10%, 15%)
- `pass_serial` - Card number
- `apple_pass_url` - URL for Apple Wallet
- `google_pass_url` - URL for Google Wallet
- `created_at` - Registration date
- `updated_at` - Last update date

### transactions Table
- `id` - Transaction UUID
- `user_id` - User ID
- `amount` - Purchase amount (after discount applied)
- `discount_applied` - Discount amount applied
- `description` - Purchase description
- `created_at` - Transaction date

## Security

⚠️ **Important**: For production:

1. Use HTTPS (required for Apple Wallet and Google Wallet)
2. Add authentication for admin panel
3. Use a more secure database (PostgreSQL, MySQL)
4. Configure CORS properly
5. Add rate limiting for API
6. Validate all incoming data
7. Store certificates in a secure location

## Deployment

### Automated Deployment

**Railway.app / Render.com:**
1. Connect your GitHub repository
2. Configure environment variables
3. Deployment happens automatically

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## Support

If you have questions or issues:
1. Check logs: `console.log` in code
2. Make sure all certificates are configured correctly
3. Check environment variables in .env
