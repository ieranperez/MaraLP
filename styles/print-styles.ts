const printStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');

  @media print {
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      background-color: #fff;
    }

    .print-container {
      width: 100%;
      margin: 0;
      padding: 0;
    }

    .print-content {
      width: 100%;
    }

    .card {
      background-color: #fff;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      margin-bottom: 1rem;
      page-break-inside: avoid;
    }

    .card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .card-title {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 1.25rem;
      color: #2d3748;
    }

    .card-content {
      padding: 1.5rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }

    th, td {
      border: 1px solid #e2e8f0;
      padding: 0.75rem;
      text-align: left;
    }

    th {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      background-color: #f7fafc;
      color: #4a5568;
    }

    .recharts-wrapper {
      margin: 0 auto;
    }

    .recharts-surface {
      width: 100% !important;
      height: auto !important;
    }

    .text-center {
      text-align: center;
    }

    .text-4xl {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 2.25rem;
    }

    .font-bold {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
    }

    .text-sm {
      font-size: 0.875rem;
    }

    .text-gray-500 {
      color: #718096;
    }

    .mt-2 {
      margin-top: 0.5rem;
    }

    .mt-4 {
      margin-top: 1rem;
    }

    .mt-6 {
      margin-top: 1.5rem;
    }

    .page-break {
      page-break-before: always;
    }

    @page {
      size: A4;
      margin: 1cm;
    }
  }
`

export default printStyles

