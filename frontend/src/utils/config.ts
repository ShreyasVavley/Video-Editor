export const getApiUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return \http://127.0.0.1:8000\\;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return \\\\;
  }
  return path;
};
