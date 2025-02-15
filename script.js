document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const convertButton = document.getElementById('convertButton');
    const previewSection = document.getElementById('previewSection');
    const previewBody = document.getElementById('previewBody');
    const totalAmount = document.getElementById('totalAmount');

    // Add this mapping near the top of the file
    const DUTCH_BANK_CODES = {
        'ABNA': 'ABNANL2A', // ABN AMRO
        'RABO': 'RABONL2U', // Rabobank
        'INGB': 'INGBNL2A', // ING Bank
        'BUNQ': 'BUNQNL2A', // Bunq
        'KNAS': 'KNABNL2H', // KAS Bank
        'SNSB': 'SNSBNL2A', // SNS Bank
        'TRIO': 'TRIONL2U', // Triodos Bank
        'FVLB': 'FVLBNL22', // van Lanschot
        'ASNB': 'ASNBNL21', // ASN Bank
        'KNAB': 'KNABNL2H', // Knab
        // Add more as needed
    };

    // Add this function to look up BIC
    function getBICFromIBAN(iban) {
        if (!iban || iban.length < 8) return '';
        
        // Extract country and bank code
        const country = iban.substring(0, 2);
        const bankCode = iban.substring(4, 8);
        
        // For now, only handle Dutch IBANs
        if (country === 'NL') {
            const bic = DUTCH_BANK_CODES[bankCode] || '';
            if (!bic) {
                console.warn(`Unknown Dutch bank code: ${bankCode} for IBAN: ${iban}`);
            }
            return bic;
        }
        
        console.warn(`Unsupported country code: ${country} for IBAN: ${iban}`);
        return '';
    }

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    convertButton.addEventListener('click', convertToCSV);

    function handleFile(file) {
        if (file && file.type === 'text/xml') {
            fileName.textContent = file.name;
            fileInfo.classList.remove('hidden');
            convertButton.disabled = true; // Disable until preview is shown
            
            const reader = new FileReader();
            reader.onload = (e) => generatePreview(e.target.result);
            reader.readAsText(file);
        } else {
            alert('Please upload a valid SEPA XML file');
        }
    }

    function generatePreview(xmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Verify it's a SEPA Credit Transfer file
        const xmlns = xmlDoc.documentElement.getAttribute('xmlns');
        if (!xmlns || !xmlns.includes('pain.001.001.03')) {
            alert('Invalid file format. Please upload a SEPA Credit Transfer (pain.001.001.03) file.');
            return;
        }

        try {
            const transactions = xmlDoc.getElementsByTagName('CdtTrfTxInf');
            let total = 0;
            let hasWarnings = false;
            
            // Clear existing preview
            previewBody.innerHTML = '';
            
            // Process each transaction for preview
            Array.from(transactions).forEach(tx => {
                const amount = parseFloat(tx.querySelector('Amt > InstdAmt').textContent);
                const iban = tx.querySelector('CdtrAcct > Id > IBAN').textContent;
                const bic = getBICFromIBAN(iban);
                total += amount;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tx.querySelector('Cdtr > Nm').textContent}</td>
                    <td class="${!bic ? 'text-danger' : ''}">${iban}${!bic ? '<br><small>⚠️ Unknown bank code</small>' : ''}</td>
                    <td>${amount.toFixed(2)} ${tx.querySelector('Amt > InstdAmt').getAttribute('Ccy')}</td>
                    <td>${tx.querySelector('RmtInf > Ustrd')?.textContent || ''}</td>
                `;
                previewBody.appendChild(row);

                if (!bic) hasWarnings = true;
            });

            // Update total and show preview
            totalAmount.textContent = `${total.toFixed(2)} EUR`;
            previewSection.classList.remove('hidden');
            
            // Show warning if any BICs are missing
            if (hasWarnings) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'alert alert-warning mt-3';
                warningDiv.innerHTML = `
                    <strong>Warning:</strong> Some bank codes could not be identified. 
                    The generated CSV might not be accepted by Revolut.
                `;
                previewSection.insertBefore(warningDiv, previewSection.querySelector('button'));
            }
            
            convertButton.disabled = false;

        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing the SEPA file. Please ensure it\'s a valid SEPA Credit Transfer file.');
        }
    }

    function convertToCSV() {
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');

            // Verify it's a SEPA Credit Transfer file
            const xmlns = xmlDoc.documentElement.getAttribute('xmlns');
            if (!xmlns || !xmlns.includes('pain.001.001.03')) {
                alert('Invalid file format. Please upload a SEPA Credit Transfer (pain.001.001.03) file.');
                return;
            }

            try {
                const transactions = xmlDoc.getElementsByTagName('CdtTrfTxInf');
                const csvRows = [];
                let hasWarnings = false;
                
                // Add header
                csvRows.push([
                    'Name',
                    'Recipient type',
                    'IBAN',
                    'BIC',
                    'Recipient bank country',
                    'Currency',
                    'Amount',
                    'Payment reference',
                ].join(','));

                // Helper function to escape CSV fields
                const escapeField = (field) => {
                    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                        // Escape double quotes with double quotes and wrap in quotes
                        return `"${field.replace(/"/g, '""')}"`;
                    }
                    return field;
                };

                // Process each transaction
                Array.from(transactions).forEach(tx => {
                    const iban = tx.querySelector('CdtrAcct > Id > IBAN').textContent;
                    const bic = getBICFromIBAN(iban);
                    if (!bic) hasWarnings = true;

                    const row = {
                        name: tx.querySelector('Cdtr > Nm').textContent,
                        recipientType: 'INDIVIDUAL',
                        iban: iban,
                        bic: bic,
                        recipientBankCountry: tx.querySelector('Cdtr > PstlAdr > Ctry').textContent,
                        currency: tx.querySelector('Amt > InstdAmt').getAttribute('Ccy'),
                        amount: tx.querySelector('Amt > InstdAmt').textContent,
                        reference: tx.querySelector('RmtInf > Ustrd')?.textContent || '',
                    };

                    csvRows.push([
                        escapeField(row.name),
                        row.recipientType,
                        row.iban,
                        row.bic,
                        row.recipientBankCountry,
                        row.currency,
                        row.amount,
                        escapeField(row.reference),
                    ].join(','));
                });

                if (hasWarnings && !confirm('Some bank codes could not be identified. The CSV file might not be accepted by Revolut. Do you want to continue?')) {
                    return;
                }

                // Create and trigger download
                const csvContent = csvRows.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                const originalFileName = file.name.replace(/\.[^/.]+$/, '');
                a.setAttribute('href', url);
                a.setAttribute('download', `${originalFileName}-revolut.csv`);
                a.click();
                window.URL.revokeObjectURL(url);

            } catch (error) {
                console.error('Error processing file:', error);
                alert('Error processing the SEPA file. Please ensure it\'s a valid SEPA Credit Transfer file.');
            }
        };

        reader.readAsText(file);
    }
}); 