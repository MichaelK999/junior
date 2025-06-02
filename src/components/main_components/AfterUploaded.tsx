'use client'

interface VideoAnalysisFeedback {
  hookRating: number;
  hookExplanation: string;
  engagementRating: number;
  engagementExplanation: string;
}

interface AfterUploadedProps {
  feedback: VideoAnalysisFeedback | null;
}

export default function AfterUploaded({ feedback }: AfterUploadedProps) {
  if (!feedback) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg">Loading analysis...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className=" rounded-2xl shadow-lg p-8 w-full max-w-xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center">Results</h2>

        <div className="space-y-4 text-gray-800">
          <div>
            <p className="font-semibold">Hook Rating:</p>
            <p>{feedback.hookRating}/100</p>
          </div>

          <div>
            <p className="font-semibold">Hook Explanation:</p>
            <p>{feedback.hookExplanation}</p>
          </div>

          <div>
            <p className="font-semibold">Engagement Rating:</p>
            <p>{feedback.engagementRating}/100</p>
          </div>

          <div>
            <p className="font-semibold">Engagement Explanation:</p>
            <p>{feedback.engagementExplanation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
