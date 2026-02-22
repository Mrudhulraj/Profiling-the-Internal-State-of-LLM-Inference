export interface Game {
    name: string
    icon: string
    genres: [string]
}

export interface UserSearchResult {
    profile_pic: string
    username: string
}

export interface PostSearchResult {
    thumbnail: string
    title: string
    id: number
}

export interface UserPost {
    videoLink: string
    title: string
    thumbnail: string
    game_category: string
    views: string
    liked_by: [number]
    gamer_tag: string
    id: number
    user: number
}

export interface HomePost {
    title: string
    thumbnail: string
    user: string
    views: string
    game_category: string
    likes: number
    comments: number
    id: number
    gamer_tag: string
    liked_by: [number]
    video: string
}

export interface CommentType {
    postId: number
    user: number
    replies: [CommentType]
    content: string
    likes: number
    userPhoto: string
    gamer_tag: string
}

export interface post {
    video: string
    game_category: string
    title: string
    liked_by: [int]
    id: number
    caption: string
    comments: [CommentType]
    created_at: string
}

export interface userData {
    posts: [UserPost]
    username: string
    id: string
    profile_pic: string
}


export interface userAutocomplete {
    gamerTag: string
}
