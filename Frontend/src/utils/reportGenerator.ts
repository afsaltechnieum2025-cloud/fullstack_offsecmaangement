import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Packer,
  PageBreak,
  ImageRun,
  Header,
} from 'docx';
import { saveAs } from 'file-saver';
import { Project, Finding } from '@/types';

// Fetch image and convert to base64
const fetchImageAsBase64 = async (url: string): Promise<{ data: Uint8Array; width: number; height: number } | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Calculate dimensions to fit within page width (max 500px width, maintain aspect ratio)
          const maxWidth = 500;
          const maxHeight = 350;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          // Convert base64 to Uint8Array for browser compatibility
          const base64Data = (reader.result as string).split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          resolve({
            data: bytes,
            width: Math.round(width),
            height: Math.round(height),
          });
        };
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const createHeading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) => {
  return new Paragraph({
    heading: level,
    children: [
      new TextRun({
        text: text,
        bold: true,
        color: 'E85D04',
      }),
    ],
    spacing: { before: 400, after: 200 },
  });
};

const createSectionTitle = (text: string) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 28,
        color: 'E85D04',
      }),
    ],
    spacing: { before: 400, after: 200 },
  });
};

const createParagraph = (text: string, options?: { bold?: boolean; size?: number }) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: options?.bold,
        size: options?.size || 22,
      }),
    ],
    spacing: { after: 100 },
  });
};

const createTableCell = (text: string, options?: { bold?: boolean; shading?: string }) => {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: options?.bold, size: 20 })] })],
    shading: options?.shading ? { fill: options.shading } : undefined,
    width: { size: 50, type: WidthType.PERCENTAGE },
  });
};

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    critical: 'DC2F02',
    high: 'E85D04',
    medium: 'F48C06',
    low: '38B000',
    info: '0096C7',
  };
  return colors[severity] || '666666';
};

export const generateTechnicalReport = async (project: Project, projectFindings: Finding[], pocImages?: Record<string, string[]>) => {
  const criticalCount = projectFindings.filter(f => f.severity === 'critical').length;
  const highCount = projectFindings.filter(f => f.severity === 'high').length;
  const mediumCount = projectFindings.filter(f => f.severity === 'medium').length;
  const lowCount = projectFindings.filter(f => f.severity === 'low').length;

  // Fetch logo for report header
  const logoUrl = `${window.location.origin}/technieum-logo.png`;
  const logoData = await fetchImageAsBase64(logoUrl);

  const findingSections: (Paragraph | Table)[] = [];
  
  for (const finding of projectFindings) {
    // Get POC images for this finding
    const findingPocs = pocImages?.[finding.id] || finding.evidence || [];
    const imageElements: (Paragraph | Table)[] = [];
    
    // Fetch and add POC images
    if (findingPocs.length > 0) {
      imageElements.push(
        new Paragraph({
          children: [new TextRun({ text: 'Proof of Concept (Evidence):', bold: true, size: 22, color: 'E85D04' })],
          spacing: { before: 150, after: 100 },
        })
      );
      
      for (let i = 0; i < findingPocs.length; i++) {
        const pocUrl = findingPocs[i];
        const imageData = await fetchImageAsBase64(pocUrl);
        
        if (imageData) {
          imageElements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Evidence ${i + 1}:`, size: 20, italics: true }),
              ],
              spacing: { before: 100, after: 50 },
            }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageData.data,
                  transformation: {
                    width: imageData.width,
                    height: imageData.height,
                  },
                  type: 'png',
                }),
              ],
              spacing: { after: 150 },
            })
          );
        } else {
          imageElements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[Evidence ${i + 1}: Image could not be loaded]`, size: 20, italics: true, color: '999999' }),
              ],
              spacing: { after: 100 },
            })
          );
        }
      }
    }

    findingSections.push(
      new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${finding.id}: ${finding.title}`,
            bold: true,
            size: 26,
            color: getSeverityColor(finding.severity),
          }),
        ],
        spacing: { before: 300, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Severity: ', bold: true, size: 22 }),
          new TextRun({ text: finding.severity.toUpperCase(), size: 22, color: getSeverityColor(finding.severity) }),
          new TextRun({ text: '    CVSS Score: ', bold: true, size: 22 }),
          new TextRun({ text: String(finding.cvssScore || 'N/A'), size: 22 }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Affected Assets: ', bold: true, size: 22 }),
          new TextRun({ text: finding.affectedAssets.join(', '), size: 22 }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Description:', bold: true, size: 22, color: 'E85D04' })],
        spacing: { before: 100, after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: finding.description, size: 22 })],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Steps to Reproduce:', bold: true, size: 22, color: 'E85D04' })],
        spacing: { before: 100, after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: finding.stepsToReproduce, size: 22 })],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Impact:', bold: true, size: 22, color: 'E85D04' })],
        spacing: { before: 100, after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: finding.impact, size: 22 })],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Remediation:', bold: true, size: 22, color: 'E85D04' })],
        spacing: { before: 100, after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: finding.remediation, size: 22 })],
        spacing: { after: 150 },
      }),
      ...imageElements,
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(80), color: 'CCCCCC' })],
        spacing: { after: 200 },
      }),
    );
  }

  // Create header with logo for all pages
  const headerChildren = logoData ? [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: logoData.data,
          transformation: {
            width: 120,
            height: Math.round(120 * (logoData.height / logoData.width)),
          },
          type: 'png',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TECHNIEUM SECURITY ASSESSMENT',
          bold: true,
          size: 18,
          color: 'E85D04',
        }),
      ],
      spacing: { after: 100 },
    }),
  ] : [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TECHNIEUM SECURITY ASSESSMENT',
          bold: true,
          size: 18,
          color: 'E85D04',
        }),
      ],
      spacing: { after: 100 },
    }),
  ];

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        children: [
          // Title Page with Logo
          ...(logoData ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: logoData.data,
                  transformation: {
                    width: 180,
                    height: Math.round(180 * (logoData.height / logoData.width)),
                  },
                  type: 'png',
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),
          ] : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'TECHNIEUM',
                bold: true,
                size: 56,
                color: 'E85D04',
              }),
            ],
            spacing: { before: logoData ? 100 : 800, after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'SECURITY ASSESSMENT REPORT',
                bold: true,
                size: 36,
                color: 'FAA307',
              }),
            ],
            spacing: { after: 600 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: project.targetDomain,
                size: 28,
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Document Classification: CONFIDENTIAL',
                size: 22,
                italics: true,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Assessment Date: ${formatDate(project.startDate)} - ${formatDate(project.endDate)}`,
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Report Date: ${formatDate(new Date())}`,
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Report Version: 1.0',
                size: 22,
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Lead Assessor: Robert Aaron',
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Security Analyst: Rejen Thompson',
                size: 22,
              }),
            ],
            spacing: { after: 600 },
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),

          // Document Control
          createSectionTitle('1. DOCUMENT CONTROL'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell('Document Title', { bold: true, shading: 'F5F5F5' }),
                  createTableCell('Penetration Testing Report'),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Target', { bold: true, shading: 'F5F5F5' }),
                  createTableCell(project.targetDomain),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Target IP', { bold: true, shading: 'F5F5F5' }),
                  createTableCell(project.targetIPs.join(', ')),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Assessment Type', { bold: true, shading: 'F5F5F5' }),
                  createTableCell('Web Application Security Assessment'),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Classification', { bold: true, shading: 'F5F5F5' }),
                  createTableCell('Confidential'),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Date', { bold: true, shading: 'F5F5F5' }),
                  createTableCell(formatDate(new Date())),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Lead Assessor', { bold: true, shading: 'F5F5F5' }),
                  createTableCell('Robert Aaron'),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Security Analyst', { bold: true, shading: 'F5F5F5' }),
                  createTableCell('Rejen Thompson'),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Prepared By', { bold: true, shading: 'F5F5F5' }),
                  createTableCell('Technieum Security Assessment Services'),
                ],
              }),
            ],
          }),

          // Executive Summary
          createSectionTitle('2. EXECUTIVE SUMMARY'),
          createParagraph(`A comprehensive security assessment was conducted on ${project.targetDomain} to identify vulnerabilities and security weaknesses. The assessment followed OWASP Testing Guide, PTES, and NIST guidelines.`),
          new Paragraph({
            children: [new TextRun({ text: 'Key Findings Summary:', bold: true, size: 24 })],
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell('Severity', { bold: true, shading: 'E85D04' }),
                  createTableCell('Count', { bold: true, shading: 'E85D04' }),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Critical', { shading: 'FEE2E2' }),
                  createTableCell(String(criticalCount)),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('High', { shading: 'FFEDD5' }),
                  createTableCell(String(highCount)),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Medium', { shading: 'FEF3C7' }),
                  createTableCell(String(mediumCount)),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Low', { shading: 'DCFCE7' }),
                  createTableCell(String(lowCount)),
                ],
              }),
            ],
          }),

          // Summary of Findings
          createSectionTitle('3. SUMMARY OF FINDINGS'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell('ID', { bold: true, shading: 'E85D04' }),
                  createTableCell('Title', { bold: true, shading: 'E85D04' }),
                  createTableCell('Severity', { bold: true, shading: 'E85D04' }),
                  createTableCell('Affected Assets', { bold: true, shading: 'E85D04' }),
                ],
              }),
              ...projectFindings.map(f => new TableRow({
                children: [
                  createTableCell(f.id),
                  createTableCell(f.title),
                  createTableCell(f.severity.toUpperCase()),
                  createTableCell(f.affectedAssets.slice(0, 2).join(', ')),
                ],
              })),
            ],
          }),

          // Detailed Findings
          createSectionTitle('4. DETAILED FINDINGS'),
          ...findingSections,

          // Remediation Roadmap
          createSectionTitle('5. REMEDIATION ROADMAP'),
          new Paragraph({
            children: [new TextRun({ text: 'IMMEDIATE (0-7 Days):', bold: true, size: 24, color: 'DC2F02' })],
            spacing: { before: 100, after: 50 },
          }),
          createParagraph('• Address all Critical severity findings immediately'),
          createParagraph('• Focus on authentication and authorization controls'),
          new Paragraph({
            children: [new TextRun({ text: 'SHORT-TERM (7-30 Days):', bold: true, size: 24, color: 'E85D04' })],
            spacing: { before: 200, after: 50 },
          }),
          createParagraph('• Remediate all High severity findings'),
          createParagraph('• Implement security headers and input validation'),
          new Paragraph({
            children: [new TextRun({ text: 'MEDIUM-TERM (30-90 Days):', bold: true, size: 24, color: 'F48C06' })],
            spacing: { before: 200, after: 50 },
          }),
          createParagraph('• Address Medium and Low severity findings'),
          createParagraph('• Conduct security training for development team'),

          // Conclusion
          createSectionTitle('6. CONCLUSION'),
          createParagraph(`The assessment identified ${projectFindings.length} security vulnerabilities across the ${project.targetDomain} platform. Immediate action is required to address the ${criticalCount} critical findings that pose significant risk to the organization.`),

          // Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '─'.repeat(60),
                color: 'CCCCCC',
              }),
            ],
            spacing: { before: 600 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CONFIDENTIAL - Technieum Security Assessment Services',
                italics: true,
                size: 20,
              }),
            ],
            spacing: { before: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Prepared by: Robert Aaron & Rejen Thompson | Date: ${formatDate(new Date())}`,
                italics: true,
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.targetDomain}_Technical_Report.docx`);
};

export const generateManagementReport = async (project: Project, projectFindings: Finding[]) => {
  const criticalCount = projectFindings.filter(f => f.severity === 'critical').length;
  const highCount = projectFindings.filter(f => f.severity === 'high').length;
  const mediumCount = projectFindings.filter(f => f.severity === 'medium').length;
  const lowCount = projectFindings.filter(f => f.severity === 'low').length;
  const totalFindings = projectFindings.length;

  const riskLevel = criticalCount > 10 ? 'CRITICAL' : criticalCount > 5 ? 'HIGH RISK' : highCount > 5 ? 'MODERATE RISK' : 'LOW RISK';

  // Fetch logo for report header
  const logoUrl = `${window.location.origin}/technieum-logo.png`;
  const logoData = await fetchImageAsBase64(logoUrl);

  // Create header with logo for all pages
  const headerChildren = logoData ? [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: logoData.data,
          transformation: {
            width: 120,
            height: Math.round(120 * (logoData.height / logoData.width)),
          },
          type: 'png',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TECHNIEUM EXECUTIVE SUMMARY',
          bold: true,
          size: 18,
          color: 'E85D04',
        }),
      ],
      spacing: { after: 100 },
    }),
  ] : [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TECHNIEUM EXECUTIVE SUMMARY',
          bold: true,
          size: 18,
          color: 'E85D04',
        }),
      ],
      spacing: { after: 100 },
    }),
  ];

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        children: [
          // Title Page with Logo
          ...(logoData ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: logoData.data,
                  transformation: {
                    width: 180,
                    height: Math.round(180 * (logoData.height / logoData.width)),
                  },
                  type: 'png',
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),
          ] : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'TECHNIEUM',
                bold: true,
                size: 56,
                color: 'E85D04',
              }),
            ],
            spacing: { before: logoData ? 100 : 800, after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'EXECUTIVE SECURITY SUMMARY',
                bold: true,
                size: 36,
                color: 'FAA307',
              }),
            ],
            spacing: { after: 600 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Client: ${project.client}`,
                size: 28,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Target: ${project.targetDomain}`,
                size: 28,
                bold: true,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Assessment Period: ${formatDate(project.startDate)} - ${formatDate(project.endDate)}`,
                size: 22,
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),

          // Security Posture
          createSectionTitle('OVERALL SECURITY POSTURE'),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: riskLevel,
                bold: true,
                size: 44,
                color: criticalCount > 5 ? 'DC2F02' : highCount > 5 ? 'E85D04' : '38B000',
              }),
            ],
            spacing: { before: 200, after: 400 },
          }),

          // Key Findings
          createSectionTitle('KEY FINDINGS SUMMARY'),
          createParagraph(`Our security assessment identified ${totalFindings} vulnerabilities:`),
          new Paragraph({
            children: [
              new TextRun({ text: '• CRITICAL: ', bold: true, size: 24, color: 'DC2F02' }),
              new TextRun({ text: `${criticalCount} issues requiring immediate attention`, size: 22 }),
            ],
            spacing: { before: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• HIGH: ', bold: true, size: 24, color: 'E85D04' }),
              new TextRun({ text: `${highCount} significant security weaknesses`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• MEDIUM: ', bold: true, size: 24, color: 'F48C06' }),
              new TextRun({ text: `${mediumCount} moderate concerns`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• LOW: ', bold: true, size: 24, color: '38B000' }),
              new TextRun({ text: `${lowCount} minor issues`, size: 22 }),
            ],
            spacing: { after: 300 },
          }),

          // Business Impact
          createSectionTitle('BUSINESS IMPACT ASSESSMENT'),
          ...(criticalCount > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: '1. FINANCIAL RISK', bold: true, size: 24 })],
              spacing: { before: 100, after: 50 },
            }),
            createParagraph('Attackers could potentially manipulate pricing, create fraudulent listings, and conduct financial fraud at scale.'),
            new Paragraph({
              children: [new TextRun({ text: '2. DATA BREACH RISK', bold: true, size: 24 })],
              spacing: { before: 200, after: 50 },
            }),
            createParagraph('Complete user database exposure including personal information and financial records. This creates significant privacy compliance violations.'),
            new Paragraph({
              children: [new TextRun({ text: '3. REPUTATIONAL DAMAGE', bold: true, size: 24 })],
              spacing: { before: 200, after: 50 },
            }),
            createParagraph('Public disclosure of vulnerabilities could severely damage customer trust and lead to business impact.'),
            new Paragraph({
              children: [new TextRun({ text: '4. LEGAL LIABILITY', bold: true, size: 24 })],
              spacing: { before: 200, after: 50 },
            }),
            createParagraph('Failure to implement basic security controls violates industry standards and creates legal exposure.'),
          ] : [
            createParagraph('The identified issues pose moderate risk to business operations.'),
          ]),

          // Recommendations
          createSectionTitle('RECOMMENDED ACTIONS'),
          new Paragraph({
            children: [new TextRun({ text: 'IMMEDIATE PRIORITIES (This Week):', bold: true, size: 24, color: 'DC2F02' })],
            spacing: { before: 200, after: 50 },
          }),
          createParagraph('• Implement authentication on all API endpoints'),
          createParagraph('• Add authorization checks for sensitive operations'),
          createParagraph('• Enable security logging and monitoring'),
          new Paragraph({
            children: [new TextRun({ text: 'SHORT-TERM (Next 30 Days):', bold: true, size: 24, color: 'E85D04' })],
            spacing: { before: 200, after: 50 },
          }),
          createParagraph('• Deploy Web Application Firewall (WAF)'),
          createParagraph('• Implement rate limiting across all endpoints'),
          createParagraph('• Conduct security training for development team'),
          new Paragraph({
            children: [new TextRun({ text: 'LONG-TERM (Next Quarter):', bold: true, size: 24, color: 'F48C06' })],
            spacing: { before: 200, after: 50 },
          }),
          createParagraph('• Establish secure development lifecycle'),
          createParagraph('• Regular penetration testing schedule'),
          createParagraph('• Security awareness program for all staff'),

          // Investment Recommendation
          createSectionTitle('INVESTMENT RECOMMENDATION'),
          createParagraph('Based on our assessment, we recommend prioritizing security investments to address the identified vulnerabilities. The cost of remediation is significantly lower than the potential costs of a security breach.'),
          new Paragraph({
            children: [
              new TextRun({
                text: 'For technical details, please refer to the full Technical Report.',
                italics: true,
                size: 22,
              }),
            ],
            spacing: { before: 300, after: 400 },
          }),

          // Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '─'.repeat(60),
                color: 'CCCCCC',
              }),
            ],
            spacing: { before: 400 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CONFIDENTIAL - Technieum Security Assessment Services',
                italics: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Prepared for: ${project.client} | Date: ${formatDate(new Date())}`,
                italics: true,
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.targetDomain}_Management_Summary.docx`);
};

// Retest Report types
interface RetestFinding {
  id: string;
  title: string;
  severity: string;
  status: string;
  retest_status: string | null;
  retest_date: string | null;
}

export const generateRetestReport = async (
  project: Project, 
  projectFindings: RetestFinding[]
) => {
  const fixedCount = projectFindings.filter(f => f.retest_status === 'Fixed').length;
  const notFixedCount = projectFindings.filter(f => f.retest_status === 'Not Fixed').length;
  const openCount = projectFindings.filter(f => f.retest_status === 'Open' || !f.retest_status).length;
  const totalFindings = projectFindings.length;
  const remediationRate = totalFindings > 0 ? Math.round((fixedCount / totalFindings) * 100) : 0;

  // Fetch logo for report header
  const logoUrl = `${window.location.origin}/technieum-logo.png`;
  const logoData = await fetchImageAsBase64(logoUrl);

  // Create header with logo for all pages
  const headerChildren = logoData ? [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: logoData.data,
          transformation: {
            width: 120,
            height: Math.round(120 * (logoData.height / logoData.width)),
          },
          type: 'png',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TECHNIEUM RETEST SUMMARY',
          bold: true,
          size: 18,
          color: 'E85D04',
        }),
      ],
      spacing: { after: 100 },
    }),
  ] : [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TECHNIEUM RETEST SUMMARY',
          bold: true,
          size: 18,
          color: 'E85D04',
        }),
      ],
      spacing: { after: 100 },
    }),
  ];

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        children: [
          // Title Page with Logo
          ...(logoData ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: logoData.data,
                  transformation: {
                    width: 180,
                    height: Math.round(180 * (logoData.height / logoData.width)),
                  },
                  type: 'png',
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),
          ] : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'TECHNIEUM',
                bold: true,
                size: 56,
                color: 'E85D04',
              }),
            ],
            spacing: { before: logoData ? 100 : 800, after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'RETEST SUMMARY REPORT',
                bold: true,
                size: 36,
                color: 'FAA307',
              }),
            ],
            spacing: { after: 600 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Client: ${project.client}`,
                size: 28,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Target: ${project.targetDomain}`,
                size: 28,
                bold: true,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Report Date: ${formatDate(new Date())}`,
                size: 22,
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),

          // Remediation Summary
          createSectionTitle('REMEDIATION SUMMARY'),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${remediationRate}%`,
                bold: true,
                size: 56,
                color: remediationRate >= 80 ? '38B000' : remediationRate >= 50 ? 'F48C06' : 'DC2F02',
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'REMEDIATION RATE',
                bold: true,
                size: 24,
                color: '666666',
              }),
            ],
            spacing: { after: 400 },
          }),

          // Status Breakdown
          createSectionTitle('RETEST STATUS BREAKDOWN'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell('Status', { bold: true, shading: 'E85D04' }),
                  createTableCell('Count', { bold: true, shading: 'E85D04' }),
                  createTableCell('Percentage', { bold: true, shading: 'E85D04' }),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Fixed', { shading: 'DCFCE7' }),
                  createTableCell(String(fixedCount)),
                  createTableCell(`${totalFindings > 0 ? Math.round((fixedCount / totalFindings) * 100) : 0}%`),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Not Fixed', { shading: 'FEE2E2' }),
                  createTableCell(String(notFixedCount)),
                  createTableCell(`${totalFindings > 0 ? Math.round((notFixedCount / totalFindings) * 100) : 0}%`),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Open (Not Retested)', { shading: 'FEF3C7' }),
                  createTableCell(String(openCount)),
                  createTableCell(`${totalFindings > 0 ? Math.round((openCount / totalFindings) * 100) : 0}%`),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Total', { bold: true, shading: 'F5F5F5' }),
                  createTableCell(String(totalFindings), { bold: true }),
                  createTableCell('100%', { bold: true }),
                ],
              }),
            ],
          }),

          // Findings by Severity with Retest Status
          createSectionTitle('FINDINGS BY SEVERITY'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell('Severity', { bold: true, shading: 'E85D04' }),
                  createTableCell('Title', { bold: true, shading: 'E85D04' }),
                  createTableCell('Retest Status', { bold: true, shading: 'E85D04' }),
                ],
              }),
              ...projectFindings.map(f => new TableRow({
                children: [
                  createTableCell(f.severity.toUpperCase()),
                  createTableCell(f.title),
                  createTableCell(f.retest_status || 'Not Retested'),
                ],
              })),
            ],
          }),

          // Conclusion
          createSectionTitle('CONCLUSION'),
          createParagraph(
            fixedCount === totalFindings 
              ? `All ${totalFindings} findings have been successfully remediated. The target application now demonstrates improved security posture.`
              : notFixedCount > 0 
                ? `Of the ${totalFindings} findings identified, ${fixedCount} have been fixed, ${notFixedCount} remain unresolved, and ${openCount} are pending retest. Immediate attention is required for unresolved findings.`
                : `Of the ${totalFindings} findings identified, ${fixedCount} have been fixed and ${openCount} are pending retest verification.`
          ),

          // Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '─'.repeat(60),
                color: 'CCCCCC',
              }),
            ],
            spacing: { before: 400 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CONFIDENTIAL - Technieum Security Assessment Services',
                italics: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Prepared for: ${project.client} | Date: ${formatDate(new Date())}`,
                italics: true,
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.targetDomain}_Retest_Report.docx`);
};