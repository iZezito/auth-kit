import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { response } = error;

    if (response?.status === 401) {
      const currentPath = window.location.pathname;
      const publicPaths = [
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/validate-email",
      ];

      if (!publicPaths.includes(currentPath)) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
