/**
 * Sasl - Social Asynchronous Sharing Layer
 * PollVote component for voting on polls.
 */
import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface PollOption {
  id: string;
  text: string;
  votes_count: number;
  voted_by_me: boolean;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  expires_at?: string;
}

interface PollVoteProps {
  postId: string;
  poll: Poll;
}

const PollVote: React.FC<PollVoteProps> = ({ postId, poll }) => {
  const [options, setOptions] = useState<PollOption[]>(poll.options);
  const [alreadyVoted, setAlreadyVoted] = useState(poll.options.some(o => o.voted_by_me));
  const [voting, setVoting] = useState(false);
  const [t] = useTranslation();

  const handleVote = async (optionId: string) => {
    if (alreadyVoted || voting) return;
    setVoting(true);
    // Optimistic update
    setOptions(prev =>
      prev.map(opt => (opt.id === optionId ? { ...opt, votes_count: opt.votes_count + 1, voted_by_me: true } : opt))
    );
    setAlreadyVoted(true);
    try {
      const res = await api.post(`/content/posts/${postId}/vote_poll/`, { option_id: optionId });
      // Replace with server data
      const updatedPoll: Poll = res.data;
      setOptions(updatedPoll.options);
    } catch (err: any) {
      // Revert
      const original = poll.options;
      setOptions(original);
      setAlreadyVoted(original.some(o => o.voted_by_me));
      toast.error(err.response?.data?.error || 'Vote failed');
    } finally {
      setVoting(false);
    }
  };

  const totalVotes = options.reduce((sum, o) => sum + o.votes_count, 0) || 1;

  return (
    <div className="mt-2 bg-gray-50 p-3 rounded-lg">
      <h4 className="font-semibold text-sm mb-2">{poll.question}</h4>
      {options.map(opt => {
        const percent = Math.round((opt.votes_count / totalVotes) * 100);
        return (
          <div key={opt.id} className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span>{opt.text}</span>
              <span className="text-gray-500">{opt.votes_count} votes ({percent}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 relative">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
              {!alreadyVoted && (
                <button
                  onClick={() => handleVote(opt.id)}
                  className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center text-white font-bold text-xs bg-black/20 rounded-full transition"
                >
                  {t('Vote')}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PollVote;