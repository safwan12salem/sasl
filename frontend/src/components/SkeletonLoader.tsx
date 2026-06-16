import React from 'react';

export const PostSkeleton = () => (
  <div className="card mb-4 animate-pulse">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div>
        <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-16" />
      </div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
    <div className="h-48 bg-gray-200 rounded-xl mb-3" />
    <div className="flex gap-4">
      <div className="h-4 bg-gray-200 rounded w-12" />
      <div className="h-4 bg-gray-200 rounded w-12" />
      <div className="h-4 bg-gray-200 rounded w-12" />
    </div>
  </div>
);

export const ProductSkeleton = () => (
  <div className="glass p-5 rounded-2xl animate-pulse">
    <div className="h-40 bg-gray-200 rounded-xl mb-3" />
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
    <div className="h-6 bg-gray-200 rounded w-1/3" />
  </div>
);

export const StreamSkeleton = () => (
  <div className="glass p-4 rounded-2xl animate-pulse">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div className="h-4 bg-gray-200 rounded w-24" />
    </div>
    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
  </div>
);

export const SessionSkeleton = () => (
  <div className="glass p-4 rounded-2xl animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-3/4" />
  </div>
);