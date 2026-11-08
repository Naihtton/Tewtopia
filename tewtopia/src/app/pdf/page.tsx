import { PdfViewerPanel } from '@/features/pdf/components/pdf-viewer-panel';
import mockPdf from '@/features/pdf/data/mockPdf';

export default function PdfPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <PdfViewerPanel fileUrl={mockPdf} className="h-[80vh] w-full max-w-6xl border" />
    </div>
  );
}
