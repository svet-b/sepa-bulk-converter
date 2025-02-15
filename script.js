document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const convertButton = document.getElementById('convertButton');
    const previewSection = document.getElementById('previewSection');
    const previewBody = document.getElementById('previewBody');
    const totalAmount = document.getElementById('totalAmount');

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
            
            // Clear existing preview
            previewBody.innerHTML = '';
            
            // Process each transaction for preview
            Array.from(transactions).forEach(tx => {
                const amount = parseFloat(tx.querySelector('Amt > InstdAmt').textContent);
                total += amount;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tx.querySelector('Cdtr > Nm').textContent}</td>
                    <td>${tx.querySelector('CdtrAcct > Id > IBAN').textContent}</td>
                    <td>${amount.toFixed(2)} ${tx.querySelector('Amt > InstdAmt').getAttribute('Ccy')}</td>
                    <td>${tx.querySelector('RmtInf > Ustrd')?.textContent || ''}</td>
                `;
                previewBody.appendChild(row);
            });

            // Update total and show preview
            totalAmount.textContent = `${total.toFixed(2)} EUR`;
            previewSection.classList.remove('hidden');
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
                    const row = {
                        name: tx.querySelector('Cdtr > Nm').textContent,
                        recipientType: 'INDIVIDUAL', // Default to 'INDIVIDUAL'. Can also be 'COMPANY'
                        iban: tx.querySelector('CdtrAcct > Id > IBAN').textContent,
                        bic: '', // BIC is optional in SEPA
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