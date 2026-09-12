import { IssueDetailView } from "@/features/browsing/IssueDetailView";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IssueDetailView id={id} />;
}
