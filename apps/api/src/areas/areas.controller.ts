import { Controller, Get } from '@nestjs/common';
import { AREAS } from './areas';

// Public: the sign-in screens and apps need it before anyone is logged in.
@Controller('areas')
export class AreasController {
  @Get()
  list() {
    return AREAS;
  }
}
