import ResourcePage from "../../components/common/ResourcePage";
import { StatusBadge } from "../../components/common/Table";
import { getInspections, createInspection } from "../../api/qualityApi";

export default function QualityInspection() {
  return (
    <ResourcePage
      title="Quality Inspection"
      subtitle="Perform and record quality inspections."
      fetcher={getInspections}
      createFn={createInspection}
      createLabel="+ New Inspection"
      emptyTitle="No inspections yet"
      emptyDescription="Record your first quality inspection."
      searchKeys={["inspection_number", "inspector", "result"]}
      filters={[
        {
          key: "result",
          label: "Result",
          placeholder: "All results",
          options: [
            { value: "pass", label: "Pass" },
            { value: "fail", label: "Fail" },
            { value: "rework", label: "Rework" },
          ],
        },
      ]}
      columns={[
        { key: "inspection_number", label: "Inspection #" },
        { key: "inspection_date", label: "Date" },
        {
          key: "result",
          label: "Result",
          render: (r) => <StatusBadge status={r.result} />,
        },
        { key: "inspector", label: "Inspector" },
        { key: "notes", label: "Notes" },
      ]}
      fields={[
        { name: "inspection_number", label: "Inspection Number", required: true },
        { name: "inspection_date", label: "Inspection Date", type: "date", required: true },
        {
          name: "result",
          label: "Result",
          type: "select",
          required: true,
          options: [
            { value: "pass", label: "Pass" },
            { value: "fail", label: "Fail" },
            { value: "rework", label: "Rework" },
          ],
        },
        { name: "inspector", label: "Inspector" },
        { name: "product_id", label: "Product ID", type: "number" },
        { name: "batch_id", label: "Batch ID", type: "number" },
        { name: "notes", label: "Notes", type: "textarea", full: true },
      ]}
    />
  );
}
