document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const convertButton = document.getElementById('convertButton');

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
            convertButton.disabled = false;
        } else {
            alert('Please upload a valid XML file');
        }
    }

    function convertToCSV() {
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
            
            // This is a basic conversion - you'll need to customize this
            // based on your XML structure
            const rows = [];
            const elements = xmlDoc.getElementsByTagName('*');
            
            // Get all unique tag names for headers
            const headers = new Set();
            for (const element of elements) {
                headers.add(element.tagName);
            }
            
            // Convert to CSV
            const csvContent = [Array.from(headers).join(',')].concat(
                Array.from(elements).map(el => 
                    Array.from(headers).map(header => 
                        el.tagName === header ? el.textContent : ''
                    ).join(',')
                )
            ).join('\n');

            // Create and trigger download
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', 'converted.csv');
            a.click();
            window.URL.revokeObjectURL(url);
        };

        reader.readAsText(file);
    }
}); 