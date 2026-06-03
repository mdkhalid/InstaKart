import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AvatarUpload } from "@/components/ui/AvatarUpload";

describe("AvatarUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering Variants ─────────────────────────────

  it("renders with an image when src is provided", () => {
    render(<AvatarUpload src="/avatar.jpg" alt="User avatar" />);
    const img = screen.getByTestId("avatar-image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/avatar.jpg");
    expect(img).toHaveAttribute("alt", "User avatar");
  });

  it("renders initials when no src is provided", () => {
    render(<AvatarUpload initials="JD" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.queryByTestId("avatar-image")).not.toBeInTheDocument();
  });

  it("renders the User icon when neither src nor initials are provided", () => {
    render(<AvatarUpload />);
    expect(screen.getByTestId("icon-user")).toBeInTheDocument();
    expect(screen.queryByTestId("avatar-image")).not.toBeInTheDocument();
  });

  // ─── Size Variants ─────────────────────────────────

  it("applies size classes for sm variant", () => {
    const { container } = render(<AvatarUpload size="sm" initials="A" />);
    const avatarCircle = container.querySelector(".rounded-full");
    expect(avatarCircle).toHaveClass("h-8", "w-8");
    expect(screen.getByText("A")).toHaveClass("text-xs");
  });

  it("applies size classes for md variant (default)", () => {
    const { container } = render(<AvatarUpload initials="A" />);
    const avatarCircle = container.querySelector(".rounded-full");
    expect(avatarCircle).toHaveClass("h-16", "w-16");
    expect(screen.getByText("A")).toHaveClass("text-sm");
  });

  it("applies size classes for lg variant", () => {
    const { container } = render(<AvatarUpload size="lg" initials="A" />);
    const avatarCircle = container.querySelector(".rounded-full");
    expect(avatarCircle).toHaveClass("h-24", "w-24");
    expect(screen.getByText("A")).toHaveClass("text-lg");
  });

  // ─── Upload Button Behavior ────────────────────────

  it("shows upload button when onUpload is provided", () => {
    const onUpload = jest.fn();
    render(<AvatarUpload onUpload={onUpload} />);
    expect(screen.getByTitle("Upload avatar")).toBeInTheDocument();
    expect(screen.getByTestId("icon-camera")).toBeInTheDocument();
  });

  it("hides upload button when onUpload is not provided", () => {
    render(<AvatarUpload />);
    expect(screen.queryByTitle("Upload avatar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-camera")).not.toBeInTheDocument();
  });

  it("disables upload button and shows uploading title when uploading is true", () => {
    const onUpload = jest.fn();
    render(<AvatarUpload onUpload={onUpload} uploading={true} />);
    const button = screen.getByTitle("Uploading...");
    expect(button).toBeDisabled();
  });

  it("calls onUpload with the selected file", () => {
    const onUpload = jest.fn();
    render(<AvatarUpload onUpload={onUpload} />);
    const file = new File(["dummy-content"], "avatar.png", { type: "image/png" });
    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("does not call onUpload when no file is selected", () => {
    const onUpload = jest.fn();
    render(<AvatarUpload onUpload={onUpload} />);
    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [] } });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("does not render file input when onUpload is not provided", () => {
    render(<AvatarUpload />);
    const input = screen.queryByTestId("file-input");
    expect(input).not.toBeInTheDocument();
  });

  // ─── Image Priority with src ───────────────────────

  it("renders image over initials when both are provided", () => {
    render(<AvatarUpload src="/photo.jpg" initials="JD" />);
    expect(screen.getByTestId("avatar-image")).toBeInTheDocument();
    expect(screen.queryByText("JD")).not.toBeInTheDocument();
  });

  it("renders image over User icon when src is provided", () => {
    render(<AvatarUpload src="/photo.jpg" />);
    expect(screen.getByTestId("avatar-image")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-user")).not.toBeInTheDocument();
  });

  // ─── Custom className ──────────────────────────────

  it("applies additional className", () => {
    const { container } = render(<AvatarUpload className="my-custom-class" />);
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  // ─── Alt text ──────────────────────────────────────

  it("uses default alt text when not provided", () => {
    render(<AvatarUpload src="/img.jpg" />);
    expect(screen.getByTestId("avatar-image")).toHaveAttribute("alt", "Avatar");
  });

  it("uses custom alt text when provided", () => {
    render(<AvatarUpload src="/img.jpg" alt="Custom alt" />);
    expect(screen.getByTestId("avatar-image")).toHaveAttribute("alt", "Custom alt");
  });
});
