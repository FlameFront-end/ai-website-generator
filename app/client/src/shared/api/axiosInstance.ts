import axios from 'axios'

import { env } from '@/shared/model/config'

const axiosInstance = axios.create({
  baseURL: env.API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export default axiosInstance
