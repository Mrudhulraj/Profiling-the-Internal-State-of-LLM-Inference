import axios from 'axios'

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_RELOAD_API_URL,
    headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        Accept: 'application/json, text/plain',
        Authorization:
            typeof window !== 'undefined'
                ? `Bearer ${localStorage?.getItem('access')}`
                : null,
    },
})

axiosInstance.interceptors.request.use(async (req) => {
    req.headers.Authorization = `Bearer ${localStorage.getItem('access')}`

    await axios
        .post(
            `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/dj-rest-auth/token/verify/`,
            {
                token: localStorage.getItem('access'),
            }
        )
        .then(() => {
            req.headers.Authorization = `Bearer ${localStorage.getItem(
                'access'
            )}`
        })
        .catch(async (error) => {
            if (error.response.status == 401)
                await axios
                    .post(
                        `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/dj-rest-auth/token/refresh/`,
                        {
                            refresh: localStorage.getItem('refresh'),
                        }
                    )
                    .then((result) => {
                        const { access } = result.data
                        req.headers.Authorization = `Bearer ${access}`
                        localStorage.setItem('access', access)
                    })
                    .catch(() => {
                        window.localStorage.removeItem('access')
                        window.localStorage.removeItem('refresh')
                        req.headers.Authorization = `Bearer ${null}`
                    })
        })

    return req
})

export default axiosInstance
