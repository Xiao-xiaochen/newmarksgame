import { Context } from 'koishi'
import { Region } from './types'
import { User } from './types'

declare module 'koishi' {
  interface Tables {
    region: Region
    User: User 
  }
}