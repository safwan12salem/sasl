/**
 * Sasl - Social Asynchronous Sharing Layer
 * Comment thread with nested replies, pagination, and typing indicator.
 */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  user: { username: string; avatar_url?: string };
  text: string;
  created_at: string;
  likes_count: number;
  replies?: Comment[];
}

interface CommentThreadProps {
  postId: string;
}

const CommentItem: React.FC<{ comment: Comment; depth?: number }> = ({ comment, depth = 0 }) => {
  const [showReplies, setShowReplies] = useState(false);
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={`pl-${depth * 4}`}>
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">{comment.user.username}</span>
            <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-sm">{comment.text}</p>
          <div className="flex gap-3 mt-1 text-xs text-gray-500">
            <span>❤️ {comment.likes_count}</span>
            {hasReplies && (
              <button onClick={() => setShowReplies(!showReplies)} className="hover:text-blue-500 flex items-center gap-1">
                {comment.replies!.length} replies {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
          <AnimatePresence>
            {showReplies && hasReplies && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
                {comment.replies!.map(reply => (
                  <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const CommentThread: React.FC<CommentThreadProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();

  const fetchComments = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/content/posts/${postId}/comments/?page=${pageNum}`);
      const data = res.data;
      if (pageNum === 1) {
        setComments(data.results);
      } else {
        setComments(prev => [...prev, ...data.results]);
      }
      setHasMore(!!data.next);
    } catch {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/content/posts/${postId}/comment/`, { text: newComment });
      setComments(prev => [res.data, ...prev]);
      setNewComment('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Comment failed');
    }
  };

  return (
    <div className="border-t pt-2 mt-2">
      {/* Add comment input */}
      <div className="flex gap-2 mb-3">
        <input
          className="input-field flex-1 text-sm py-2"
          placeholder="Write a comment..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddComment()}
        />
        <button onClick={handleAddComment} className="btn-primary p-2"><Send size={16} /></button>
      </div>

      {/* Comment list */}
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}

      {loading && <div className="flex justify-center py-2"><Loader2 className="animate-spin" size={18} /></div>}
      {hasMore && !loading && (
        <button onClick={() => { setPage(prev => prev + 1); fetchComments(page + 1); }} className="text-sm text-green-500 hover:underline">
          Load more comments
        </button>
      )}
    </div>
  );
};

export default CommentThread;