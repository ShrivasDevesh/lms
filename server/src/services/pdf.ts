import PDFDocument from 'pdfkit';
import type { Response } from 'express';

interface ResultPdfData {
  result: any;
  student: any;
  exam: any;
}

export const streamResultPdf = ({ result, student, exam }: ResultPdfData, res: Response) => {
  const fileName = `${student.studentCode ?? student.name}-result.pdf`.replace(/[^a-zA-Z0-9.-]/g, '-');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${exam.title} Result` } });
  doc.pipe(res);

  doc.fontSize(22).font('Helvetica-Bold').text('LMS EXAM PORTAL', { align: 'center' });
  doc.moveDown(0.2).fontSize(11).font('Helvetica').fillColor('#546078').text('Official Examination Result', { align: 'center' });
  doc.moveDown(1.5).fillColor('#111827');

  doc.roundedRect(48, 115, 499, 95, 10).fillAndStroke('#f4f7fb', '#dce3ef');
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(16).text(exam.title, 68, 136);
  doc.font('Helvetica').fontSize(10).fillColor('#546078').text(`${exam.course} • ${exam.subject} • Batch ${exam.batch}`, 68, 163);
  doc.text(`Exam date: ${new Date(exam.startAt).toLocaleString('en-IN')}`, 68, 181);

  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(13).text('Student details', 48, 235);
  doc.font('Helvetica').fontSize(11);
  const rows = [
    ['Name', student.name],
    ['Student ID', student.studentCode ?? student._id.toString()],
    ['Email', student.email],
    ['Batch', student.batch ?? '-']
  ];
  let y = 260;
  for (const [label, value] of rows) {
    doc.fillColor('#667085').text(label, 48, y, { width: 120 });
    doc.fillColor('#101828').font('Helvetica-Bold').text(String(value), 170, y, { width: 360 });
    doc.font('Helvetica');
    y += 23;
  }

  doc.font('Helvetica-Bold').fontSize(13).text('Performance summary', 48, y + 12);
  y += 45;
  const cards = [
    ['Score', `${result.obtainedMarks}/${result.totalMarks}`],
    ['Percentage', `${result.percentage}%`],
    ['Status', String(result.status).toUpperCase()],
    ['Rank', result.rank ? `#${result.rank}` : '-']
  ];
  cards.forEach(([label, value], index) => {
    const x = 48 + index * 126;
    doc.roundedRect(x, y, 112, 68, 8).fillAndStroke('#ffffff', '#dce3ef');
    doc.fillColor('#667085').font('Helvetica').fontSize(9).text(label, x + 12, y + 14, { width: 88, align: 'center' });
    doc.fillColor('#101828').font('Helvetica-Bold').fontSize(16).text(String(value), x + 12, y + 34, { width: 88, align: 'center' });
  });

  y += 95;
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(13).text('Answer analysis', 48, y);
  y += 25;
  const analysis = [
    ['Total questions', result.totalQuestions],
    ['Attempted', result.attemptedQuestions],
    ['Correct answers', result.correctAnswers],
    ['Incorrect answers', result.incorrectAnswers],
    ['Unanswered', result.unansweredQuestions],
    ['Percentile', result.percentile ? `${result.percentile}%` : '-']
  ];
  analysis.forEach(([label, value], index) => {
    const rowY = y + index * 26;
    doc.fillColor(index % 2 === 0 ? '#f8fafc' : '#ffffff').rect(48, rowY, 499, 24).fill();
    doc.fillColor('#475467').font('Helvetica').fontSize(10).text(String(label), 60, rowY + 7);
    doc.fillColor('#101828').font('Helvetica-Bold').text(String(value), 420, rowY + 7, { width: 110, align: 'right' });
  });

  const footerY = 760;
  doc.moveTo(48, footerY).lineTo(547, footerY).strokeColor('#dce3ef').stroke();
  doc.fillColor('#667085').font('Helvetica').fontSize(8).text(`Result ID: ${result._id}`, 48, footerY + 12);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 330, footerY + 12, { width: 217, align: 'right' });
  doc.end();
};
