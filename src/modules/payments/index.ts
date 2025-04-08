import axios from "axios";
import { PAYSTACK_API_URL, PAYSTACK_PUBLIC_KEY } from "../../config/env";

export const paystackApi = axios.create({
  baseURL: PAYSTACK_API_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_PUBLIC_KEY}`,
    "Content-Type": "application/json",
  },
});
