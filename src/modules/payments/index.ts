import axios from "axios";
import { SQUADCO_API_URL, SQUADCO_PUBLIC_KEY } from "../../config/env";

export const squadApi = axios.create({
  baseURL: SQUADCO_API_URL,
  headers: {
    Authorization: `Bearer ${SQUADCO_PUBLIC_KEY}`,
    "Content-Type": "application/json",
  },
});
