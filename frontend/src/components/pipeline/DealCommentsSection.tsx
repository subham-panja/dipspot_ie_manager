'use client';

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { DealComment } from './pipelineTypes';

interface DealCommentsSectionProps {
  dealComments: DealComment[];
  loadingComments: boolean;
  onPostComment: (text: string, author: string, tag: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export default function DealCommentsSection({
  dealComments,
  loadingComments,
  onPostComment,
  onDeleteComment,
}: DealCommentsSectionProps) {
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('Trade Specialist');
  const [commentTag, setCommentTag] = useState('Customer Update');

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    await onPostComment(commentText.trim(), commentAuthor, commentTag);
    setCommentText('');
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          Interactive Comments &amp; Deal History
        </h4>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
          {dealComments.length} Comments
        </span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {loadingComments ? (
          <div className="text-xs text-slate-500 py-4 text-center">Loading comments...</div>
        ) : dealComments.length > 0 ? (
          dealComments.map((c) => (
            <div
              key={c.id}
              className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl text-xs space-y-1.5 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-purple-400">{c.author || 'Trade Specialist'}</span>
                  <span className="px-1.5 py-0.2 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {c.tag || 'Update'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono">
                    {c.created_at ? c.created_at.slice(11, 16) : 'Just now'}
                  </span>
                  <button
                    onClick={() => onDeleteComment(c.id)}
                    className="text-slate-600 hover:text-rose-400 text-[10px]"
                    title="Delete comment"
                  >
                    &times;
                  </button>
                </div>
              </div>
              <p className="text-slate-200 text-xs font-normal leading-relaxed">{c.text}</p>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-500 italic py-3 text-center border border-dashed border-slate-800/80 rounded-xl">
            No comments logged yet. Add negotiation notes, counter-offers, or port milestones below.
          </div>
        )}
      </div>

      <div className="space-y-2 pt-1 border-t border-slate-800/60">
        <div className="flex gap-2">
          <select
            value={commentTag}
            onChange={(e) => setCommentTag(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 px-2 py-1.5 rounded-lg outline-none"
          >
            <option value="Customer Update">Customer Update</option>
            <option value="Pricing Counter-Offer">Pricing Counter-Offer</option>
            <option value="Port Milestone">Port Milestone</option>
            <option value="Internal Review">Internal Review</option>
            <option value="L/C Verification">L/C Verification</option>
          </select>
          <input
            type="text"
            placeholder="Your name / role"
            value={commentAuthor}
            onChange={(e) => setCommentAuthor(e.target.value)}
            className="w-32 bg-slate-950 border border-slate-800 text-[11px] text-white px-2 py-1.5 rounded-lg outline-none"
          />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add an interactive comment (Press Enter)..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSubmit}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
