
import { notFound } from "next/navigation";

type CasePageProps = {
  params: Promise<{ id: string }>;
};

type CaseRecord = {
  id: string;
  [key: string]: unknown;
};

export default async function CasePage({
  params,
}: CasePageProps) {
  const { id } = await params;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "";

  const response = await fetch(
    `${baseUrl}/api/cases/${encodeURIComponent(id)}`,
    {
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Failed to load case details.");
  }

  const caseData: CaseRecord = await response.json();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Case Details
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Case ID: {caseData.id}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <tbody>
            {Object.entries(caseData).map(([key, value]) => (
              <tr key={key} className="border-b last:border-b-0">
                <th className="bg-gray-50 px-4 py-3 font-medium">
                  {key.replace(/_/g, " ")}
                </th>
                <td className="break-words px-4 py-3">
                  {value === null || value === undefined
                    ? "N/A"
                    : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
