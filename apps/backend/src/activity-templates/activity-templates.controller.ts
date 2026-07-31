import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@workflow-brasal/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ActivityTemplatesService } from './activity-templates.service';
import { CreateActivityTemplateDto } from './dto/create-activity-template.dto';
import { UpdateActivityTemplateDto } from './dto/update-activity-template.dto';

@ApiTags('activity-templates')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('activity-templates')
export class ActivityTemplatesController {
  constructor(private readonly templatesService: ActivityTemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateActivityTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateActivityTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Get(':id/dependencies')
  getDependencies(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.getDependencies(id);
  }

  @Post(':id/dependencies/:dependsOnId')
  addDependency(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependsOnId', ParseIntPipe) dependsOnId: number,
  ) {
    return this.templatesService.addDependency(id, dependsOnId);
  }

  @Delete(':id/dependencies/:dependsOnId')
  removeDependency(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependsOnId', ParseIntPipe) dependsOnId: number,
  ) {
    return this.templatesService.removeDependency(id, dependsOnId);
  }
}
