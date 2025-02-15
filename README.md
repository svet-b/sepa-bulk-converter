# SEPA Batch to Revolut CSV Converter

A browser-based tool to convert SEPA XML batch payment files into Revolut-compatible bulk payment CSV files. The conversion happens entirely in your browser - no data is sent to any server.

## Features
- Convert SEPA XML batch payment files to Revolut bulk payment CSV format
- Drag & drop file upload
- No server required - works entirely client-side
- Modern, responsive design
- Secure - your payment data never leaves your browser

## Usage
Visit the [GitHub Pages site](https://svet-b.github.io/sepa-bulk-converter) to use the converter.

## Supported File Formats
### Input
- SEPA Credit Transfer Initiation (pain.001.001.03)
- XML format following the ISO 20022 standard

### Output
- Revolut bulk payment CSV format
- Compatible with Revolut Business bulk payment upload

## BIC/SWIFT Code Handling
The tool will obtain BIC codes in the following order:
1. First try to get the BIC from the XML file if present (`CdtrAgt > FinInstnId > BIC`)
2. If not found in the XML, for Dutch bank accounts, derive the BIC from the IBAN bank code (positions 5-8)

For Dutch IBANs, the following bank codes are supported:
- ABNA (ABN AMRO) -> ABNANL2A
- RABO (Rabobank) -> RABONL2U
- INGB (ING Bank) -> INGBNL2A
- BUNQ (Bunq) -> BUNQNL2A
- KNAS (KAS Bank) -> KNABNL2H
- SNSB (SNS Bank) -> SNSBNL2A
- TRIO (Triodos Bank) -> TRIONL2U
- FVLB (van Lanschot) -> FVLBNL22
- ASNB (ASN Bank) -> ASNBNL21
- KNAB (Knab) -> KNABNL2H

If a BIC cannot be determined, you will be warned before generating the CSV file.

## Local Development
Clone the repository and open `index.html` in your browser to run locally.
