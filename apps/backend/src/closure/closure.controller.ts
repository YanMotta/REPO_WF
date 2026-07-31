import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClosureService } from './closure.service';
import { GenerateClosureDto } from './dto/generate-closure.dto';

@ApiTags('closure')
@ApiBearerAuth()
@Controller('closure')
export class ClosureController {
  constructor(private readonly closureService: ClosureService) {}

  @Post('generate')
  generate(@Body() dto: GenerateClosureDto) {
    return this.closureService.generateForMonth(dto.month, dto.year);
  }
}
