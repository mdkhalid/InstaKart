"use client";

import { useEffect, useState } from "react";
import { Star, ThumbsUp, ChevronDown, ChevronUp, User } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/stores/authStore";
import { useConfirm } from "@/hooks/useConfirm";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Image from "next/image";

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

interface ReviewSectionProps {
  productSlug: string;
  productId: string;
}

export function ReviewSection({ productSlug, productId }: ReviewSectionProps) {
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState("");
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    fetchReviews();
  }, [productSlug]);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get(`/reviews/product/${productSlug}`);
      setReviews(data.data.reviews || []);
      setAverageRating(data.data.averageRating || 0);
      setTotalReviews(data.data.totalReviews || 0);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (formRating < 1) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/reviews", {
        productId,
        rating: formRating,
        title: formTitle.trim() || undefined,
        comment: formComment.trim() || undefined,
      });
      setReviews((prev) => [data.data, ...prev]);
      setAverageRating(
        Math.round(((averageRating * totalReviews + formRating) / (totalReviews + 1)) * 10) / 10
      );
      setTotalReviews((prev) => prev + 1);
      setShowForm(false);
      setFormRating(5);
      setFormTitle("");
      setFormComment("");
      toast.success("Review submitted!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    const ok = await confirm({
      title: "Delete review?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("Review deleted");
      fetchReviews();
    } catch {
      toast.error("Failed to delete review");
    }
  };

  const renderStars = (rating: number, interactive = false) => (
    <div className="flex items-center space-x-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? "button" : undefined}
          disabled={!interactive}
          onClick={() => interactive && setFormRating(star)}
          className={cn(
            "transition-colors",
            interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
          )}
        >
          <Star
            className={cn(
              "h-4 w-4",
              star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
            )}
          />
        </button>
      ))}
    </div>
  );

  const initials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "U";

  return (
    <div className="mt-10 border-t pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
          {totalReviews > 0 && (
            <div className="flex items-center space-x-2 mt-1">
              {renderStars(Math.round(averageRating))}
              <span className="text-sm text-gray-500">
                {averageRating} out of 5 ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>
        {user && (
          <Button
            variant={showForm ? "outline" : "default"}
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Write a Review"}
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="bg-gray-50 border rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Write Your Review</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              {renderStars(formRating, true)}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Summarize your review"
                maxLength={100}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
              <textarea
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                placeholder="Tell others about your experience with this product..."
                maxLength={1000}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <Button onClick={handleSubmit} loading={submitting}>
              Submit Review
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10">
          <Star className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No reviews yet</p>
          {user ? (
            <p className="text-xs text-gray-400 mt-1">Be the first to review this product</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Sign in to leave a review</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isOwn = user?.id === review.user.id;
            return (
              <div key={review.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {review.user.avatarUrl ? (
                        <Image
                          src={review.user.avatarUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                          style={{ width: "auto", height: "auto" }}
                        />
                      ) : (
                        <span className="text-xs font-semibold text-primary-700">
                          {initials(review.user.firstName, review.user.lastName)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {review.user.firstName} {review.user.lastName}
                        {review.isVerifiedPurchase && (
                          <span className="ml-1.5 text-xs text-green-600 font-normal">✓ Verified</span>
                        )}
                      </p>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {review.title && (
                  <h4 className="font-semibold text-sm text-gray-900 mb-1">{review.title}</h4>
                )}
                {review.comment && (
                  <p className="text-sm text-gray-600 whitespace-pre-line">{review.comment}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
