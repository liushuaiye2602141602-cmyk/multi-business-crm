"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-300">500</h1>
        <p className="text-xl text-gray-600 mt-4">系统错误</p>
        <p className="text-gray-500 mt-2">{error.message || "服务器遇到了问题"}</p>
        <button
          onClick={() => reset()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  );
}
