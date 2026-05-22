import api from "../lib/axios";

export const getProfile = async () => {
  return api.get("/profile/");
};