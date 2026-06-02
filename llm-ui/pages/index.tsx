import Head from 'next/head'
import Navbar from '../components/Navbar'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { models } from '../utils/gamesList'
import SearchIcon from '@mui/icons-material/Search'
import UserSearch from '../components/UserSearch'
import PostSearch from '../components/PostSearch'
import { PostSearchResult, UserSearchResult } from '../utils/typings'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useDispatch, useSelector } from 'react-redux'
import { selectActiveUser } from '../slices/userSlice'
import FilterListIcon from '@mui/icons-material/FilterList'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import { useRouter } from 'next/router'
import CloseIcon from '../icons/CloseIcon'
import { removeUploadingPost, selectUploadingPost } from '../slices/postSlice'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

const Home = () => {
    const activeUser = useSelector(selectActiveUser)
    const uploadingPost = useSelector(selectUploadingPost)
    const [homePosts, setHomePosts] = useState<any>([])

    const dispatch = useDispatch()

    const router = useRouter()

    const [searchQuery, setSearchQuery] = useState<string>('')

    const [selectedGames, setSelectedGames] = useState<any>([])

    const [gamesBody, setGamesBody] = useState('')

    const [postOrder, setPostOrder] = useState<string>('')
    const [openDropdown, setOpenDropdown] = useState(false)

    const [postSearch, setPostSearch] = useState<any>([])
    const [userSearch, setUserSearch] = useState<any>([])

    const [showNotification, setShowNotification] = useState(false)

    useEffect(() => {
        setShowNotification(() => {
            return uploadingPost.post != null
        })
    }, [uploadingPost])

    useEffect(() => {
        setGamesBody(selectedGames.join(','))
    }, [selectedGames])

    useEffect(() => {
        if (postOrder == 'Latest' || !postOrder) {
            axios
                .get(`${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/homepage/`)
                .then((result) => {
                    setHomePosts(result.data)
                })
                .catch((error) => {
                    if (error.response.status == 401) {
                        console.log('Unauthorized')
                    }
                })
        } else if (postOrder == 'Popularity') {
            axios
                .get(
                    `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/posts/?ordering=-views`
                )
                .then((result) => {
                    setHomePosts(result.data)
                })
                .catch((error) => {
                    if (error.response.status == 401) {
                        console.log('Unauthorized')
                    }
                })
        } else if (postOrder == 'My Liked') {
            setHomePosts(activeUser?.liked_posts)
        }
    }, [postOrder])

    useEffect(() => {
        const fetchGames = async () => {
            const posts = await axios.get(
                `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/posts/?game_category=${gamesBody}`
            )

            return posts
        }

        if (!gamesBody) {
            axios
                .get(`${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/homepage/`)
                .then((result) => {
                    setHomePosts(result.data)
                })
                .catch((error) => {
                    if (error.response.status == 401) {
                        console.log('Unauthorized')
                    }
                })
        }
        if (gamesBody) {
            fetchGames()
                .then((result) => {
                    setHomePosts(result.data)
                })
                .catch((error) => {
                    console.log(error)
                })
        }
    }, [gamesBody])

    useEffect(() => {
        const searchFunction = setTimeout(() => {
            if (searchQuery == '') {
                setUserSearch([])
                setPostSearch([])
            } else {
                axios
                    .get(
                        `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/posts/?search=${searchQuery}`
                    )
                    .then((result) => {
                        setPostSearch(result.data)
                    })
                    .catch((error) => {
                        if (error.response.status == 401) {
                            console.log('Unauthorized')
                        }
                    })

                axios
                    .get(
                        `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/users/?search=${searchQuery}`
                    )
                    .then((result) => {
                        setUserSearch(result.data)
                    })
                    .catch((error) => {
                        if (error.response.status == 401) {
                            console.log('Unauthorized')
                        }
                    })
            }
        }, 1000)

        return () => clearTimeout(searchFunction)
    }, [searchQuery])

    const handleGameClick = (game: any) => {
        const gameIndex = selectedGames.indexOf(game.name)

        if (gameIndex == -1) {
            setSelectedGames([...selectedGames, game.name])
        } else {
            const tempGames = selectedGames.filter(
                (gameItem: any) => gameItem !== game.name
            )
            setSelectedGames(tempGames)
        }
        window.scrollTo(0, 0)
    }

    const handleSearchPosts = (e: any) => {
        e.preventDefault()

        if (searchQuery) {
            axios
                .get(
                    `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/posts/?search=${searchQuery}`
                )
                .then((result) => {
                    setPostSearch(result.data)
                })
                .catch((error) => {
                    if (error.response.status == 401) {
                        console.log('Unauthorized')
                    }
                })

            axios
                .get(
                    `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/users/?search=${searchQuery}`
                )
                .then((result) => {
                    setUserSearch(result.data)
                })
                .catch((error) => {
                    if (error.response.status == 401) {
                        console.log('Unauthorized')
                    }
                })
        }
    }

    const handleScrollLeft = () => {
        const gamesDiv = document.getElementById('gamesList')

        gamesDiv?.scrollBy(-200, 0)
    }

    const handleScrollRight = () => {
        const gamesDiv = document.getElementById('gamesList')

        gamesDiv?.scrollBy(200, 0)
    }

    return (
        <div>
            <Head>
                <title>Reload</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="w-full">
                {/* sticky top-[-5.5rem] */}
                {/* sticky top-[-12.5rem] z-10 flex w-full flex-col transition md:top-[-14rem] xl:top-[-21rem] */}
                <div className="sticky top-[-5.5rem] z-10 flex w-full flex-col transition">
                    <Navbar />
                    <div
                        className="group fixed bottom-10 right-10 z-50 hidden cursor-pointer rounded-full border border-blue-500 p-2 text-blue-500 transition duration-300 hover:scale-110 hover:border-none hover:bg-blue-500 hover:text-white lg:block"
                        onClick={() => window.scrollTo(0, 0)}
                    >
                        <KeyboardArrowUpIcon />

                        <div className="absolute bottom-12 -right-6 w-[6rem] scale-0 rounded-md bg-purple-700 p-2 text-center text-xs text-white transition duration-200 group-hover:scale-100">
                            Scroll to top
                        </div>
                    </div>
                    <div className="mb-4 w-full bg-[#101012] py-4">
                        {showNotification && (
                            <div className="mx-auto w-5/6">
                                <button className="mb-4 flex animate-pulse items-center space-x-4 rounded-2xl bg-green-500 p-4 transition duration-300">
                                    <div
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setShowNotification(false)
                                            dispatch(removeUploadingPost())
                                        }}
                                    >
                                        <CloseIcon />
                                    </div>

                                    <h1 className="text-left text-lg">
                                        Your post is uploading and will appear
                                        once approved.
                                    </h1>
                                </button>
                            </div>
                        )}
                        <div className="mx-auto flex w-5/6 flex-col justify-start space-y-2 border-b-2 border-[#282828]/80 lg:space-y-6">
                            {/* search bar */}
                            <div className="flex w-full items-center space-x-4">
                                <div className="relative flex w-full items-center rounded-xl border border-blue-500 bg-[#0F0F0F] px-4">
                                    <form
                                        className="w-full"
                                        onClick={handleSearchPosts}
                                    >
                                        <input
                                            placeholder="Search for Inference Models..."
                                            className="w-full bg-transparent py-4 px-2 outline-none"
                                            value={searchQuery}
                                            onChange={(e) =>
                                                setSearchQuery(() => {
                                                    return e.target.value
                                                })
                                            }
                                        />

                                        <button
                                            className="hidden"
                                            type="submit"
                                        />
                                    </form>

                                    <div
                                        className="h-full cursor-pointer p-3"
                                        onClick={handleSearchPosts}
                                    >
                                        <SearchIcon />
                                    </div>

                                    {/* search results */}
                                    {userSearch && postSearch && searchQuery && (
                                        <div className="absolute left-0 top-12 z-10 flex max-h-[24rem] w-full flex-col space-y-4 bg-[#0F0F0F] p-2 md:flex-row md:space-y-0">
                                            {/* user search */}

                                            <div
                                                className={`max-h-[11rem] w-full overflow-y-scroll border-b pb-3 scrollbar-hide md:max-h-[20rem] md:border-b-0 md:${
                                                    postSearch.length &&
                                                    'border-r'
                                                } ${
                                                    !userSearch.length &&
                                                    'hidden'
                                                }`}
                                            >
                                                <div className="flex w-full justify-center">
                                                    <h1>Users</h1>
                                                </div>

                                                <div className="ml-4">
                                                    {userSearch.map(
                                                        (
                                                            search: UserSearchResult
                                                        ) => (
                                                            <UserSearch
                                                                key={search.username}
                                                                userSearchResult={
                                                                    search
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* post search */}

                                            <div
                                                className={`max-h-[11rem] w-full overflow-y-scroll pb-3 scrollbar-hide md:max-h-[20rem] ${
                                                    !postSearch.length &&
                                                    'hidden'
                                                }`}
                                            >
                                                <div className="flex w-full justify-center">
                                                    <h1>Posts</h1>
                                                </div>

                                                <div className="ml-4">
                                                    {postSearch.map(
                                                        (
                                                            search: PostSearchResult
                                                        ) => (
                                                            <PostSearch
                                                                key={search.id}
                                                                postSearchResult={
                                                                    search
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div
                                    onClick={() =>
                                        setOpenDropdown(!openDropdown)
                                    }
                                    className="relative cursor-pointer rounded-xl border  border-blue-500 bg-[#0F0F0F] p-4 md:w-auto"
                                >
                                    <h1 className="flex items-center justify-between space-x-4 whitespace-nowrap">
                                        {!postOrder && (
                                            <div className="flex items-center space-x-4">
                                                <FilterListIcon />
                                            </div>
                                        )}
                                        {postOrder == 'Popularity' && (
                                            <div className="flex items-center space-x-4">
                                                <TrendingUpIcon />
                                            </div>
                                        )}
                                        {postOrder == 'Latest' && (
                                            <div className="flex items-center space-x-4">
                                                <AccessTimeIcon />
                                            </div>
                                        )}
                                        {postOrder == 'My Liked' && (
                                            <div className="flex items-center space-x-4">
                                                <FavoriteBorderIcon />
                                            </div>
                                        )}
                                    </h1>

                                    {openDropdown && (
                                        <div className="top-13 absolute right-0 z-20 w-[10.5rem] space-y-2 rounded-xl bg-[#0F0F0F] p-2 md:w-[10rem]">
                                            <div
                                                className="flex border-b px-2 py-3"
                                                onClick={() => {
                                                    setPostOrder('Popularity')
                                                    window.scrollTo(0, 0)
                                                    setOpenDropdown(false)
                                                }}
                                            >
                                                <div className="flex w-full items-center space-x-4 transition duration-300 hover:scale-105">
                                                    <TrendingUpIcon />
                                                    <h1>Popularity</h1>
                                                </div>
                                            </div>
                                            <div
                                                className="flex border-b px-2 py-3"
                                                onClick={() => {
                                                    setPostOrder('Latest')
                                                    window.scrollTo(0, 0)
                                                    setOpenDropdown(false)
                                                }}
                                            >
                                                <div className="flex w-full space-x-4 transition duration-300 hover:scale-105">
                                                    <AccessTimeIcon />
                                                    <h1>Latest</h1>
                                                </div>
                                            </div>
                                            {activeUser && (
                                                <div
                                                    className="flex px-2 py-3 transition"
                                                    onClick={() => {
                                                        setPostOrder('My Liked')
                                                        window.scrollTo(0, 0)
                                                        setOpenDropdown(false)
                                                    }}
                                                >
                                                    <div className="flex w-full items-center space-x-4 duration-300 hover:scale-105">
                                                        <FavoriteBorderIcon />
                                                        <h1>My Liked</h1>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="relative flex items-center space-x-3">
                                    <h1
                                        onClick={handleScrollLeft}
                                        className="group hidden cursor-pointer rounded-full bg-[#0f0f0f] py-2 px-4 transition duration-300 hover:bg-[#091C5F] md:flex"
                                    >
                                        <ChevronLeftIcon className="transition duration-300 group-hover:scale-120" />
                                    </h1>
                                    <div
                                        id="gamesList"
                                        className="flex space-x-4 overflow-y-scroll scroll-smooth p-3 scrollbar-hide"
                                    >
                                        {models.map((game) => (
                                            <div
                                                key={game.name}
                                                onClick={() =>
                                                    handleGameClick(game)
                                                }
                                                className={`delay-30 flex w-full cursor-pointer items-center space-x-3 rounded-2xl px-4 py-2 transition duration-300 ease-in-out hover:scale-110 active:scale-95 ${
                                                    selectedGames.includes(
                                                        game.name
                                                    )
                                                        ? 'bg-gradient-to-r from-indigo-600 to-[#a48dff]'
                                                        : 'border border-gray-800 hover:border-blue-500'
                                                }`}
                                            >
                                                <div className="h-6 w-6">
                                                    <img
                                                        src={game.icon}
                                                        className="h-full w-full"
                                                    />
                                                </div>
                                                <h1 className="whitespace-nowrap">
                                                    {game.name}
                                                </h1>
                                            </div>
                                        ))}
                                    </div>

                                    <h1
                                        onClick={handleScrollRight}
                                        className="group hidden cursor-pointer rounded-full bg-[#0f0f0f] py-2 px-4 transition duration-300 hover:bg-[#091C5F] md:flex"
                                    >
                                        <ChevronRightIcon className="transition duration-300 group-hover:scale-120" />
                                    </h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Home
