import { Controller, Get } from '@nestjs/common'
import { DEFAULT_FREE_DAILY_CREDITS, ROLES } from '@comikube/shared'

@Controller()
export class AppController {
  @Get()
  getInfo() {
    return {
      roles: [...ROLES],
      defaultFreeDailyCredits: DEFAULT_FREE_DAILY_CREDITS,
    }
  }
}