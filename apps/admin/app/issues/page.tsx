"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertCircle, Image as ImageIcon, ExternalLink } from "lucide-react";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { formatPrice, formatDateTime } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

const ISSUE_TYPE_LABELS: Record<string, string> = {
  WRONG_ITEM: "Wrong item",
  DAMAGED: "Damaged",
  MISSING_ITEM: "Missing item",
  POOR_QUALITY: "Poor quality",
  EXPIRED: "Near expiry",
  OTHER: "Other",
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  AUTO_APPROVED: "Auto-Approved",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
};

export default function IssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchIssues();
  }, [page, statusFilter]);

  const fetchIssues = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
      });
      const { data } = await api.get(`/admin/issues?${params}`);
      setIssues(data.data?.issues || []);
      setTotalPages(data.data?.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = search
    ? issues.filter((i) =>
        [i.order?.orderNumber, i.reportedBy?.email, i.reportedBy?.firstName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
      )
    : issues;

  const counts = {
    OPEN: issues.filter((i) => i.status === "OPEN").length,
    AUTO_APPROVED: issues.filter((i) => i.status === "AUTO_APPROVED").length,
    APPROVED: issues.filter((i) => i.status === "APPROVED").length,
    REJECTED: issues.filter((i) => i.status === "REJECTED").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issues & Refunds</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customer-reported issues from delivered orders
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium">Open (pending review)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{counts.OPEN}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium">Auto-approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {counts.AUTO_APPROVED}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium">Manually approved</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {counts.APPROVED}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {counts.REJECTED}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order #, customer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="AUTO_APPROVED">Auto-approved</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {/* Issue list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No issues found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue: any) => (
            <div
              key={issue.id}
              onClick={() => router.push(`/issues/${issue.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">
                    {ISSUE_TYPE_LABELS[issue.type] || issue.type}
                  </span>
                  {issue.orderItem && (
                    <span className="text-xs text-gray-500">
                      · {issue.orderItem.productName}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    · {issue.order?.orderNumber}
                  </span>
                </div>
                <StatusBadge variant={getStatusVariant(issue.status) as any}>
                  {ISSUE_STATUS_LABELS[issue.status] || issue.status}
                </StatusBadge>
              </div>

              <p className="text-xs text-gray-500 mb-2">
                Reported by {issue.reportedBy?.firstName} {issue.reportedBy?.lastName}{" "}
                ({issue.reportedBy?.email})
              </p>

              {issue.description && (
                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                  {issue.description}
                </p>
              )}

              {issue.photoUrls && issue.photoUrls.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {issue.photoUrls.length} photo
                  {issue.photoUrls.length !== 1 ? "s" : ""}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>{formatDateTime(issue.createdAt)}</span>
                {issue.refundAmount && (
                  <span className="font-semibold text-green-700">
                    Refund: {formatPrice(Number(issue.refundAmount))}
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
