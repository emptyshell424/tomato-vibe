import { redirect } from 'next/navigation'
import { AiReportView } from '@/components/AiReportView'
import { getFocusReportOverview } from '@/lib/supabase/server-reports'

async function getReport() {
  const report = await getFocusReportOverview('weekly')

  if (!report) {
    redirect('/')
  }

  return report
}

export default async function ReportsPage() {
  const report = await getReport()

  return <AiReportView initialReport={report} />
}
