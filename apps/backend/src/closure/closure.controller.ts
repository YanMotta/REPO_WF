import { Body, Controller, Delete, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClosureService } from './closure.service';
import { DeleteClosureDto } from './dto/delete-closure.dto';
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

  @Delete()
  delete(@Query() dto: DeleteClosureDto) {
    return this.closureService.deleteForMonth(dto.month, dto.year);
  }
}
