import Head from 'next/head'
import Navbar from '../../components/Navbar'
import FeedPost from '../../components/FeedPost'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { models } from '../../utils/gamesList'
import { useRouter } from 'next/router'
import LazyLoad from 'react-lazy-load'

const Home = () => {
    const [homePosts, setHomePosts] = useState<any>([])

    const router = useRouter()

    const { gameCategory } = router.query

    const [gameObj, setGameObj] = useState<any>('')

    useEffect(() => {
        const fetchGames = async () => {
            const gamesList = await axios.get(
                `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/posts/?game_category=${gameCategory}`
            )

            return gamesList
        }

        fetchGames()
            .then((result) => {
                setHomePosts(result.data)
            })
            .catch((error) => {
                console.log(error)
            })
    }, [gameCategory])

    useEffect(() => {
        for (let i = 0; i < models.length; i++) {
            if (models[i].name == gameCategory) {
                setGameObj(models[i])
            }
        }
    }, [gameCategory])

    return (
        <div>
            <Head>
                <title>Reload</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="w-full">
                <Navbar />

                {/* feed posts */}
                <div className="mx-auto  w-5/6 flex-col space-y-4 py-8">
                    {/* welcome header */}
                    <div className="flex w-full flex-col justify-start space-y-2 border-b-2 border-blue-500 pb-4 lg:space-y-6">
                        <h1 className="whitespace-nowrap font-montserrat text-xl font-semibold lg:text-[42px]">
                            View clips from
                            <span className="text-[#8388ff]">
                                &nbsp;{gameCategory}
                            </span>
                        </h1>

                        <div className="flex items-center space-x-4">
                            <div className="w-12">
                                <img
                                    src={gameObj?.icon}
                                    alt="game_icon"
                                    className="h-full w-full rounded-full"
                                />
                            </div>

                            <div className="flex items-center space-x-2 overflow-x-scroll scrollbar-hide">
                                {gameObj?.genres?.map((genre: string) => (
                                    <h1 className="whitespace-nowrap rounded-full bg-gray-600 px-4 py-2">
                                        {genre}
                                    </h1>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* feed posts */}
                    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {homePosts ? (
                            homePosts.map((post: any) => (
                                <LazyLoad threshold={0.6} height={380}>
                                    <FeedPost key={post.id} feedPost={post} />
                                </LazyLoad>
                            ))
                        ) : (
                            <>
                                <h1>
                                    You have no posts here! Follow other gamers
                                    to see their posts
                                </h1>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home
