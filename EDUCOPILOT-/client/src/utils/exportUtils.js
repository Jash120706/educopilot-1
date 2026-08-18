import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';

/**
 * Clean text filename helper
 */
const sanitizeFilename = (name) => {
  return (name || 'Document')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
};

/**
 * Strip raw markdown markers (*, **, `, _, ~) from text strings
 * and replace non-ASCII / unicode math symbols with clean ASCII characters
 * to prevent jsPDF font-width encoding glitches (wide letter spacing).
 */
export const stripMarkdown = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u00A0\u200B\u202F]/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/^#{1,6}\s*/, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2022/g, '•')
    .replace(/½/g, '1/2')
    .replace(/⅓/g, '1/3')
    .replace(/⅔/g, '2/3')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/±/g, '+/-')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Universal EduCopilot Watermark & Footer Stamp Generator
 * Applies a 45-degree diagonal translucent 'EDUCOPILOT' watermark across EVERY page
 * plus a footer compliance stamp.
 */
export const applyEduCopilotWatermark = (doc, customDocumentTitle = 'EduCopilot • Official Academic Document') => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // 1. Large 45-Degree Translucent Diagonal Watermark
    doc.saveGraphicsState();
    if (typeof doc.GState === 'function') {
      doc.setGState(new doc.GState({ opacity: 0.05 }));
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(54);
    doc.setTextColor(148, 163, 184); // Slate-400 tint rendered with 5% alpha

    doc.text('EDUCOPILOT', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();

    // 1.5 Outer Black Border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // 2. Footer Brand Stamp
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `CONFIDENTIAL  •  ${customDocumentTitle.toUpperCase()}  •  PAGE ${p} OF ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );

    // Footer divider line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 9, pageWidth - 15, pageHeight - 9);
  }
};

/**
 * Smart markdown to jsPDF renderer that formats headings, lists, bold concepts,
 * and paragraphs with precise page boundary checks.
 */
const renderMarkdownToPdf = (doc, rawText, startX, startY, contentWidth, pageHeight, margin) => {
  let yPos = startY;
  const lines = (rawText || '').split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      yPos += 3;
      continue;
    }

    // Check page overflow
    if (yPos > pageHeight - margin - 15) {
      doc.addPage();
      yPos = margin + 6;
    }

    // Heading 1: # Title
    if (trimmed.startsWith('# ')) {
      const heading = stripMarkdown(trimmed);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13.5);
      doc.setTextColor(15, 23, 42);
      yPos += 4;
      const split = doc.splitTextToSize(heading, contentWidth);
      doc.text(split, startX, yPos);
      yPos += split.length * 6 + 2;
      continue;
    }

    // Heading 2: ## Section
    if (trimmed.startsWith('## ')) {
      const heading = stripMarkdown(trimmed);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(30, 41, 59);
      yPos += 3.5;
      const split = doc.splitTextToSize(heading, contentWidth);
      doc.text(split, startX, yPos);
      yPos += split.length * 5.2 + 2;
      continue;
    }

    // Heading 3 / 4: ### Subtitle
    if (
      trimmed.startsWith('### ') ||
      trimmed.startsWith('#### ') ||
      /^\*\*[^*]+\*\*[:]?$/.test(trimmed)
    ) {
      const heading = stripMarkdown(trimmed).replace(/:$/, '');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235);
      yPos += 3;
      const split = doc.splitTextToSize(heading, contentWidth);
      doc.text(split, startX, yPos);
      yPos += split.length * 4.8 + 1.5;
      continue;
    }

    // Bullet points: * item or - item or • item
    if (/^[-*•+]\s+/.test(trimmed)) {
      const bulletContent = stripMarkdown(trimmed.replace(/^[-*•+]\s+/, ''));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);

      doc.text('-', startX + 1.5, yPos);
      const splitBullet = doc.splitTextToSize(bulletContent, contentWidth - 7);
      doc.text(splitBullet, startX + 6, yPos);
      yPos += splitBullet.length * 4.5 + 1.2;
      continue;
    }

    // Numbered list: 1. item or 1) item
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numMatch) {
      const numLabel = `${numMatch[1]}.`;
      const itemContent = stripMarkdown(numMatch[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(37, 99, 235);
      doc.text(numLabel, startX + 1.5, yPos);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const splitItem = doc.splitTextToSize(itemContent, contentWidth - 9);
      doc.text(splitItem, startX + 7.5, yPos);
      yPos += splitItem.length * 4.5 + 1.2;
      continue;
    }

    // Regular paragraph text
    const cleanParagraph = stripMarkdown(trimmed);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const splitPara = doc.splitTextToSize(cleanParagraph, contentWidth);
    doc.text(splitPara, startX, yPos);
    yPos += splitPara.length * 4.5 + 2;
  }

  return yPos;
};

/**
 * 1. Export Lecture Slides to PowerPoint (.pptx)
 * 16:9 widescreen layout with proper margins and wrapping.
 */
export const exportSlidesToPPT = async (material) => {
  if (!material || !material.content?.slides) {
    throw new Error('No slide content available to export.');
  }

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9'; // Exact 10.0 x 5.625 inches
  pptx.author = 'EduCopilot';
  pptx.title = stripMarkdown(material.title || material.topic);

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: 'FFFFFF' };

  // Outer Border
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0.15,
    y: 0.15,
    w: 9.7,
    h: 5.325,
    fill: { color: 'FFFFFF' },
    line: { color: '000000', width: 2 },
  });

  // Watermark
  titleSlide.addText('EDUCOPILOT', {
    x: 2.0,
    y: 1.8,
    w: 6.0,
    h: 2.0,
    fontSize: 48,
    bold: true,
    color: 'F1F5F9',
    align: 'center',
    valign: 'middle',
    rotate: 315,
    fontFace: 'Arial',
  });

  // Category Pill
  titleSlide.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.0,
    w: 2.2,
    h: 0.35,
    fill: { color: 'FFFFFF' },
    line: { color: '000000', width: 1.5 },
  });
  titleSlide.addText('EduCopilot AI Deck', {
    x: 0.8,
    y: 1.0,
    w: 2.2,
    h: 0.35,
    fontSize: 10,
    color: '000000',
    bold: true,
    align: 'center',
    fontFace: 'Arial',
  });

  // Deck Title
  titleSlide.addText(stripMarkdown(material.title || material.topic), {
    x: 0.8,
    y: 1.6,
    w: 8.4,
    h: 2.0,
    fontSize: 28,
    bold: true,
    color: '000000',
    fontFace: 'Arial',
  });

  // Meta Footer
  titleSlide.addText(
    `Subject: ${material.subject || 'General'}   |   Benchmark: ${material.syllabusRef || 'Standard Course Curriculum'}`,
    {
      x: 0.8,
      y: 4.5,
      w: 8.4,
      h: 0.45,
      fontSize: 11,
      color: '000000',
      fontFace: 'Arial',
    }
  );

  // Content Slides
  material.content.slides.forEach((slideData, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Outer Border
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.15,
      y: 0.15,
      w: 9.7,
      h: 5.325,
      fill: { color: 'FFFFFF' },
      line: { color: '000000', width: 2 },
    });

    // Watermark
    slide.addText('EDUCOPILOT', {
      x: 2.0,
      y: 1.8,
      w: 6.0,
      h: 2.0,
      fontSize: 48,
      bold: true,
      color: 'F1F5F9',
      align: 'center',
      valign: 'middle',
      rotate: 315,
      fontFace: 'Arial',
    });

    slide.addText(`Slide ${slideData.slideNumber || idx + 1}: ${stripMarkdown(slideData.title || '')}`, {
      x: 0.5,
      y: 0.3,
      w: 6.8,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: '000000',
      fontFace: 'Arial',
    });

    // Top Right Brand
    slide.addText(material.subject || 'EduCopilot', {
      x: 7.5,
      y: 0.3,
      w: 2.0,
      h: 0.5,
      fontSize: 10,
      color: '000000',
      bold: true,
      align: 'right',
      fontFace: 'Arial',
    });

    // Header Divider Line
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 0.85,
      w: 9.0,
      h: 0.02,
      fill: { color: '000000' },
    });

    // Bullet Points
    if (slideData.bullets && slideData.bullets.length > 0) {
      const bulletItems = slideData.bullets.map((b) => ({
        text: stripMarkdown(b),
        options: { fontSize: 13, color: '000000', bullet: true, spaceAfter: 12 },
      }));

      slide.addText(bulletItems, {
        x: 0.6,
        y: 1.25,
        w: 8.8,
        h: 3.6,
        fontFace: 'Arial',
      });
    }

    // Slide Bottom Watermark Stamp
    slide.addText('EDUCOPILOT AI CO-PILOT', {
      x: 7.0,
      y: 5.0,
      w: 2.5,
      h: 0.3,
      fontSize: 8.5,
      bold: true,
      color: '000000',
      align: 'right',
      fontFace: 'Arial',
    });
  });

  const filename = `${sanitizeFilename(material.topic)}_Lecture_Slides.pptx`;
  await pptx.writeFile({ fileName: filename });
};

/**
 * Export Lecture Slides to PDF (Landscape A4 Slide Format)
 */
export const exportSlidesToPDF = (material) => {
  if (!material || !material.content?.slides) {
    throw new Error('No slide content available to export.');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const slides = material.content.slides || [];
  slides.forEach((slideData, idx) => {
    if (idx > 0) doc.addPage();

    // Outer Border Box
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Header Slide Pill
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, 10, 28, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`SLIDE ${slideData.slideNumber || idx + 1}`, margin + 4, 14.5);

    // Brand Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${material.subject || 'EduCopilot'} • ${material.topic || ''}`, pageWidth - margin, 14.5, { align: 'right' });

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 18, pageWidth - margin, 18);

    // Slide Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    const cleanTitle = stripMarkdown(slideData.title || '');
    const titleLines = doc.splitTextToSize(cleanTitle, pageWidth - margin * 2);
    doc.text(titleLines, margin, 26);

    let yPos = 26 + titleLines.length * 7 + 4;

    // Bullet Points
    if (slideData.bullets && slideData.bullets.length > 0) {
      slideData.bullets.forEach((bullet) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text('•', margin + 2, yPos);

        const cleanB = stripMarkdown(bullet);
        const bulletLines = doc.splitTextToSize(cleanB, pageWidth - margin * 2 - 12);
        doc.text(bulletLines, margin + 8, yPos);
        yPos += bulletLines.length * 5.5 + 3;
      });
    }

    // Visual Suggestion Box
    if (slideData.visualSuggestion) {
      yPos = Math.max(yPos + 4, pageHeight - 35);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 12, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text('Visual Diagram Suggestion:', margin + 4, yPos + 5);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const visLines = doc.splitTextToSize(stripMarkdown(slideData.visualSuggestion), pageWidth - margin * 2 - 45);
      doc.text(visLines, margin + 44, yPos + 5);
    }
  });

  applyEduCopilotWatermark(doc, 'EduCopilot • Official Lecture Slide Deck');

  const filename = `${sanitizeFilename(material.topic)}_Lecture_Slides.pdf`;
  doc.save(filename);
};

/**
 * 2. Export Structured Notes to PDF
 */
export const exportNotesToPDF = (material) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Header Banner
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('EduCopilot • Course Structured Notes', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Subject: ${material.subject || 'N/A'}  |  Date: ${new Date().toLocaleDateString()}`, margin, 20);

  // Header Divider
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, 25, pageWidth - margin, 25);

  yPos = 38;

  // Topic Title
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleText = stripMarkdown(material.title || material.topic);
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  doc.text(titleLines, margin, yPos);
  yPos += titleLines.length * 7 + 3;

  if (material.syllabusRef) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`Syllabus Benchmark: ${stripMarkdown(material.syllabusRef)}`, margin, yPos);
    yPos += 7;
  }

  // Divider
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Render Notes with smart Markdown parser
  const rawNotes =
    typeof material.content === 'object'
      ? material.content?.lectureNotes || JSON.stringify(material.content, null, 2)
      : material.content;

  renderMarkdownToPdf(doc, rawNotes, margin, yPos, contentWidth, pageHeight, margin);

  // Apply EduCopilot Watermark
  applyEduCopilotWatermark(doc, 'EduCopilot • Course Structured Notes');

  const filename = `${sanitizeFilename(material.topic)}_Structured_Notes.pdf`;
  doc.save(filename);
};

/**
 * 3. Export Assignment with Rubric to PDF
 */
export const exportAssignmentToPDF = (material) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Header Banner
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('EduCopilot • Course Assignment & Rubric', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Subject: ${material.subject || 'General'}  |  Target Topic: ${material.topic || 'General'}`, margin, 20);

  // Header Divider
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, 25, pageWidth - margin, 25);

  yPos = 38;

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleText = stripMarkdown(material.title || material.topic);
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  doc.text(titleLines, margin, yPos);
  yPos += titleLines.length * 7 + 4;

  // Instructions
  if (material.content?.instructions) {
    const cleanInstructions = stripMarkdown(material.content.instructions);
    const insLines = doc.splitTextToSize(cleanInstructions, contentWidth - 34);
    const boxHeight = Math.max(14, insLines.length * 4.5 + 8);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('INSTRUCTIONS:', margin + 4, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(insLines, margin + 32, yPos + 6);
    yPos += boxHeight + 6;
  }

  // Assignment Questions
  const assignments = material.content?.assignments || [];
  assignments.forEach((item, idx) => {
    const cleanQ = stripMarkdown(item.question || '');
    const qLines = doc.splitTextToSize(cleanQ, contentWidth);
    
    let rubricBoxHeight = 0;
    let rubricLines = [];
    if (item.rubric) {
      const cleanRubric = stripMarkdown(item.rubric);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      rubricLines = doc.splitTextToSize(`Grading Rubric: ${cleanRubric}`, contentWidth - 16);
      rubricBoxHeight = rubricLines.length * 4.5 + 8;
    }

    const totalItemHeight = 6 + qLines.length * 4.8 + rubricBoxHeight + 8;

    if (yPos + totalItemHeight > pageHeight - margin - 15) {
      doc.addPage();
      yPos = margin + 6;
    }

    // Question Title + Points
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Question ${idx + 1}`, margin, yPos);

    doc.setTextColor(0, 0, 0);
    doc.text(`(${item.points || 25} Points)`, pageWidth - margin - 25, yPos);
    yPos += 6;

    // Question text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(qLines, margin, yPos);
    yPos += qLines.length * 4.8 + 3;

    // Rubric Box
    if (item.rubric) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos, contentWidth, rubricBoxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(rubricLines, margin + 5, yPos + 6);

      yPos += rubricBoxHeight + 8;
    } else {
      yPos += 6;
    }
  });

  applyEduCopilotWatermark(doc, 'EduCopilot • Course Assignment & Rubric');

  const filename = `${sanitizeFilename(material.topic)}_Assignment_Rubric.pdf`;
  doc.save(filename);
};

/**
 * 4. Export Practice Questions Bank to PDF
 * Fits questions and solution boxes neatly with page overflow calculation & padding.
 */
export const exportQuestionsToPDF = (material) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Header Banner
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('EduCopilot • Practice Questions & Solution Bank', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Subject: ${material.subject || 'General'}  |  Topic: ${material.topic || 'General'}`, margin, 20);

  // Header Divider
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, 25, pageWidth - margin, 25);

  yPos = 38;

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleText = stripMarkdown(material.title || material.topic);
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  doc.text(titleLines, margin, yPos);
  yPos += titleLines.length * 7 + 6;

  // Questions List
  const questions = material.content?.practiceQuestions || [];
  questions.forEach((item, idx) => {
    const cleanQ = stripMarkdown(item.question || '');
    const qLines = doc.splitTextToSize(cleanQ, contentWidth);

    let solutionBoxHeight = 0;
    let ansLines = [];
    if (item.modelAnswer) {
      const cleanAns = stripMarkdown(item.modelAnswer);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      ansLines = doc.splitTextToSize(`Model Solution: ${cleanAns}`, contentWidth - 16);
      solutionBoxHeight = ansLines.length * 4.8 + 8;
    }

    const totalBlockHeight = 6 + qLines.length * 4.8 + solutionBoxHeight + 8;

    // Check if entire question block (statement + solution box) fits on current page
    if (yPos + totalBlockHeight > pageHeight - margin - 15) {
      doc.addPage();
      yPos = margin + 6;
    }

    // Question Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Question ${idx + 1} [${item.difficulty || 'Medium'}]`, margin, yPos);

    doc.setTextColor(37, 99, 235);
    doc.text(`(${item.points || 10} Points)`, pageWidth - margin - 25, yPos);
    yPos += 6;

    // Question Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(qLines, margin, yPos);
    yPos += qLines.length * 4.8 + 3;

    // Model Solution Box
    if (item.modelAnswer) {
      doc.setFillColor(248, 250, 252); // Slate-50 fill
      doc.setDrawColor(203, 213, 225); // Slate-300 border
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos, contentWidth, solutionBoxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      // Render text at margin + 5 with proper line spacing
      doc.text(ansLines, margin + 5, yPos + 6);

      yPos += solutionBoxHeight + 8;
    } else {
      yPos += 6;
    }
  });

  applyEduCopilotWatermark(doc, 'EduCopilot • Practice Question Bank');

  const filename = `${sanitizeFilename(material.topic)}_Practice_Question_Bank.pdf`;
  doc.save(filename);
};

/**
 * 5. Export Slot-by-Slot Lecture Plan to PDF
 * Fits slots neatly and prevents 1-line page breaks.
 */
export const exportLecturePlanToPDF = (planData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('EduCopilot • Course Slot-by-Slot Lecture Schedule', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Subject: ${planData.subject || 'General'} (${planData.courseCode || 'Course'})  |  Periods: ${planData.numPeriods || planData.plan?.length || 5} (${planData.minutesPerPeriod || 60}m each)`,
    margin,
    20
  );

  yPos = 38;

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleText = stripMarkdown(planData.title || `${planData.subject} Lecture Plan`);
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  doc.text(titleLines, margin, yPos);
  yPos += titleLines.length * 7 + 3;

  if (planData.deadline) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Target Deadline: ${planData.deadline}`, margin, yPos);
    yPos += 7;
  }

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // At-Risk Topics Banner (if any)
  if (planData.at_risk_topics && planData.at_risk_topics.length > 0) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    const alertLines = doc.splitTextToSize(
      `AT-RISK TOPICS (Exceeding Time Budget): ${planData.at_risk_topics.join(', ')}`,
      contentWidth - 10
    );
    const boxHeight = alertLines.length * 4.5 + 8;
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(alertLines, margin + 5, yPos + 6);
    yPos += boxHeight + 8;
  }

  // Slot-by-Slot Plan Items
  const planSlots = planData.plan || [];
  planSlots.forEach((slot) => {
    const topicLines = doc.splitTextToSize(stripMarkdown(slot.topic || ''), contentWidth - 4);
    
    let subtopicsHeight = 0;
    if (slot.subtopics && slot.subtopics.length > 0) {
      slot.subtopics.forEach((st) => {
        const stLines = doc.splitTextToSize(stripMarkdown(st), contentWidth - 12);
        subtopicsHeight += stLines.length * 4.2 + 1.5;
      });
    }

    let prereqHeight = 0;
    if (slot.prerequisites && slot.prerequisites.length > 0) {
      prereqHeight = 6;
    }

    const totalSlotBlockHeight = 12 + topicLines.length * 5 + subtopicsHeight + prereqHeight + 6;

    if (yPos + totalSlotBlockHeight > pageHeight - margin - 15) {
      doc.addPage();
      yPos = margin + 6;
    }

    // Slot Header Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, contentWidth, 8, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text(`PERIOD ${slot.period} [${slot.type || 'lecture'}]`, margin + 4, yPos + 5.5);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${planData.minutesPerPeriod || 60} Minutes`, pageWidth - margin - 25, yPos + 5.5);

    yPos += 12;

    // Topic Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(topicLines, margin + 2, yPos);
    yPos += topicLines.length * 5 + 2;

    // Subtopics
    if (slot.subtopics && slot.subtopics.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);

      slot.subtopics.forEach((st) => {
        doc.text('-', margin + 4, yPos);
        const stLines = doc.splitTextToSize(stripMarkdown(st), contentWidth - 12);
        doc.text(stLines, margin + 8, yPos);
        yPos += stLines.length * 4.2 + 1.5;
      });
    }

    // Prerequisites
    if (slot.prerequisites && slot.prerequisites.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(59, 130, 246);
      doc.text(`Prerequisites: ${slot.prerequisites.map(stripMarkdown).join(', ')}`, margin + 4, yPos);
      yPos += 5.5;
    }

    yPos += 4;
  });

  // Notes
  if (planData.notes) {
    const noteLines = doc.splitTextToSize(`Notes: ${stripMarkdown(planData.notes)}`, contentWidth);
    const notesHeight = noteLines.length * 4.5 + 4;

    if (yPos + notesHeight > pageHeight - margin - 12) {
      doc.addPage();
      yPos = margin + 6;
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(noteLines, margin, yPos);
  }

  applyEduCopilotWatermark(doc, 'EduCopilot • Lecture Schedule Plan');

  const filename = `${sanitizeFilename(planData.subject)}_Lecture_Schedule_Plan.pdf`;
  doc.save(filename);
};

/**
 * 6. Export Exam / Test Paper to PDF
 */
export const exportTestToPDF = (testData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  const titleText = stripMarkdown(testData.title || 'Curriculum Scoped Assessment');
  const subjectText = `${testData.subjectCode || 'CS301'} - ${testData.subject || 'Distributed Systems'}`;
  const durationText = `${testData.durationMinutes || 15} Mins`;
  const difficultyText = testData.difficulty || 'Medium';

  const drawPageHeader = (titleLabel) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(titleLabel, margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Subject: ${subjectText}  |  Prof: ${testData.professorName || 'N/A'}`, margin, 17);
    doc.text(`Duration: ${durationText}  |  Difficulty: ${difficultyText}`, margin, 22);
  };

  const addNewPage = (headerTitle = titleText) => {
    doc.addPage();
    drawPageHeader(headerTitle);
  };

  drawPageHeader(titleText);
  yPos = 38;

  // Student details section block
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Student Name: _______________________', margin + 4, yPos + 6);
  doc.text('Roll No: _______________', margin + 115, yPos + 6);
  doc.text('Date: ________________________', margin + 4, yPos + 12);
  doc.text('Score: _______ / _______', margin + 115, yPos + 12);
  yPos += 22;

  // Instructions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('EXAM INSTRUCTIONS:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('1. All questions are compulsory. Please attend all questions.', margin, yPos + 4.5);
  doc.text('2. No external materials or electronic devices are permitted during the examination.', margin, yPos + 8.5);
  yPos += 14;

  const questions = testData.questions || [];

  questions.forEach((q, idx) => {
    const cleanQ = stripMarkdown(q.question);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    // Wrap width minus 32mm guarantees zero collision with right-margin (2 pts) badge
    const qLines = doc.splitTextToSize(cleanQ, contentWidth - 32);
    
    let optionsHeight = 0;
    if (q.questionType === 'MCQ' || q.questionType === 'TrueFalse' || (!q.questionType && q.options?.length > 0)) {
      const opts = q.options || [];
      opts.forEach((opt) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const splitOpt = doc.splitTextToSize(stripMarkdown(opt), contentWidth - 24);
        optionsHeight += splitOpt.length * 4.2 + 1;
      });
    } else if (q.questionType === 'FillBlank') {
      optionsHeight = 6;
    } else {
      optionsHeight = (q.questionType === 'ShortAnswer' ? 3 : 5) * 6;
    }

    const totalQHeight = qLines.length * 4.5 + optionsHeight + 6;

    if (yPos + totalQHeight > pageHeight - margin - 15) {
      addNewPage();
      yPos = 36;
    }

    // Question Number & Points
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Q${idx + 1}.`, margin, yPos);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`(${q.points || 2} pts)`, pageWidth - margin - 15, yPos);

    // Question Statement
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(qLines, margin + 8, yPos);
    yPos += qLines.length * 4.5 + 2.5;

    // Formatting based on type
    if (q.questionType === 'MCQ' || q.questionType === 'TrueFalse' || (!q.questionType && q.options?.length > 0)) {
      const opts = q.options || [];
      opts.forEach((opt) => {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.rect(margin + 10, yPos - 2.8, 3.2, 3.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const splitOpt = doc.splitTextToSize(stripMarkdown(opt), contentWidth - 24);
        doc.text(splitOpt, margin + 16, yPos);
        yPos += splitOpt.length * 4.2 + 1;
      });
      yPos += 2;
    } else if (q.questionType === 'FillBlank') {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Write blank term here: ____________________________________', margin + 10, yPos);
      yPos += 6;
    } else {
      const numLines = q.questionType === 'ShortAnswer' ? 3 : 5;
      for (let l = 0; l < numLines; l++) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin + 10, yPos, pageWidth - margin, yPos);
        yPos += 6;
      }
      yPos += 2;
    }
  });

  applyEduCopilotWatermark(doc, 'EduCopilot • Official Examination Paper');

  const filename = `${sanitizeFilename(testData.title || testData.topic)}_Official_Exam_Paper.pdf`;
  doc.save(filename);
};

/**
 * Export Assessment Examination Paper to Word Document (.doc / .docx)
 */
export const exportTestToDOCX = (testData) => {
  const title = stripMarkdown(testData.title || testData.topic || 'Assessment Examination');
  const subject = testData.subject || 'General Academic';
  const duration = testData.durationMinutes || 15;
  const questions = testData.questions || [];

  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 1in; }
      h1 { font-size: 18pt; font-weight: bold; color: #0f172a; margin-bottom: 4pt; }
      .meta { font-size: 10pt; color: #475569; margin-bottom: 12pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 8pt; }
      .box { border: 1px solid #cbd5e1; background: #f8fafc; padding: 10pt; margin-bottom: 15pt; }
      .q-header { font-size: 11pt; font-weight: bold; color: #0f172a; margin-top: 14pt; }
      .pts { color: #2563eb; font-weight: bold; float: right; }
      .q-text { font-size: 11pt; margin-bottom: 6pt; }
      .opt { margin-left: 20pt; margin-bottom: 4pt; font-size: 10.5pt; }
      .blank-line { border-bottom: 1px solid #94a3b8; height: 16pt; margin: 6pt 0 12pt 20pt; }
    </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Subject: ${subject} | Duration: ${duration} Mins | Professor: ${testData.professorName || 'N/A'}</div>
      
      <div class="box">
        <strong>Student Name:</strong> _______________________ &nbsp;&nbsp;&nbsp;&nbsp; <strong>Roll No:</strong> _______________<br/>
        <strong>Date:</strong> ________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Score:</strong> _______ / _______
      </div>

      <h3>EXAM INSTRUCTIONS:</h3>
      <ol>
        <li>All questions are compulsory. Please attend all questions.</li>
        <li>No external materials or electronic devices are permitted during examination.</li>
      </ol>
      <hr/>
  `;

  questions.forEach((q, idx) => {
    htmlContent += `
      <div class="q-header">
        Question ${idx + 1} <span class="pts">(${q.points || 2} pts)</span>
      </div>
      <div class="q-text">${stripMarkdown(q.question)}</div>
    `;

    if (q.questionType === 'MCQ' || q.questionType === 'TrueFalse' || (!q.questionType && q.options?.length > 0)) {
      (q.options || []).forEach((opt, optIdx) => {
        const char = String.fromCharCode(65 + optIdx);
        htmlContent += `<div class="opt">[ &nbsp; ] &nbsp; <strong>${char}.</strong> ${stripMarkdown(opt)}</div>`;
      });
    } else if (q.questionType === 'FillBlank') {
      htmlContent += `<div class="blank-line">Write blank term here: ____________________________________</div>`;
    } else {
      const numLines = q.questionType === 'ShortAnswer' ? 3 : 5;
      for (let l = 0; l < numLines; l++) {
        htmlContent += `<div class="blank-line"></div>`;
      }
    }
  });

  htmlContent += `
      <br/><br/>
      <div style="text-align: center; font-size: 9pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10pt;">
        Dispatched via EduCopilot Official Teaching Suite
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword',
  });

  const filename = `${sanitizeFilename(testData.title || testData.topic)}_Official_Exam_Paper.doc`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 7. Export Student Study Plan Roadmap to PDF
 */
export const exportStudyPlanToPDF = (plan) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Header Banner
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('EduCopilot • Student Multi-Day Study Roadmap', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(219, 234, 254);
  doc.text(
    `Subject: ${plan.subject || 'General'} (${plan.subjectCode || 'Course'})  |  Exam Target: ${plan.targetExamDate || 'N/A'}`,
    margin,
    20
  );

  yPos = 38;

  // Topic Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleText = stripMarkdown(plan.topic || `${plan.subject} Study Plan`);
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  doc.text(titleLines, margin, yPos);
  yPos += titleLines.length * 7 + 3;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Plan Days
  const days = plan.planDays || [];
  days.forEach((dayItem) => {
    const tasks = dayItem.tasks || [];
    let tasksHeight = 0;
    tasks.forEach((t) => {
      const taskText = typeof t === 'object' ? t.taskTitle || t.description || '' : t;
      const splitTask = doc.splitTextToSize(stripMarkdown(taskText), contentWidth - 12);
      tasksHeight += splitTask.length * 4.2 + 2;
    });

    const totalDayHeight = 12 + tasksHeight + 4;

    if (yPos + totalDayHeight > pageHeight - margin - 15) {
      doc.addPage();
      yPos = margin + 6;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, contentWidth, 8, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text(`DAY ${dayItem.dayNumber || dayItem.day}: ${stripMarkdown(dayItem.title || 'Study Slot')}`, margin + 4, yPos + 5.5);

    yPos += 12;

    tasks.forEach((t) => {
      const taskText = typeof t === 'object' ? t.taskTitle || t.description || '' : t;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('-', margin + 4, yPos);
      const splitTask = doc.splitTextToSize(stripMarkdown(taskText), contentWidth - 12);
      doc.text(splitTask, margin + 8, yPos);
      yPos += splitTask.length * 4.2 + 2;
    });

    yPos += 4;
  });

  applyEduCopilotWatermark(doc, 'EduCopilot • Student Study Roadmap');

  const filename = `${sanitizeFilename(plan.topic || plan.subject)}_Study_Plan_Roadmap.pdf`;
  doc.save(filename);
};
