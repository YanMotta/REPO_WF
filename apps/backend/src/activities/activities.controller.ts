import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { ChangeCoResponsibleDto } from './dto/change-co-responsible.dto';
import { ChangeResponsibleDto } from './dto/change-responsible.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() filter: ActivityFilterDto) {
    return this.activitiesService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(id, dto);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.changeStatus(id, dto, user.id);
  }

  @Patch(':id/responsible')
  changeResponsible(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeResponsibleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.changeResponsible(id, dto, user.id);
  }

  @Patch(':id/co-responsible')
  changeCoResponsible(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeCoResponsibleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.changeCoResponsible(id, dto, user.id);
  }

  @Get(':id/blocked-by')
  getBlockedBy(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.getBlockedBy(id);
  }

  /** All dependencies (regardless of completion) — backs the "Predecessora" column in the UI. */
  @Get(':id/dependencies')
  getDependencies(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.getDependencies(id);
  }

  @Post(':id/dependencies/:dependsOnId')
  addDependency(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependsOnId', ParseIntPipe) dependsOnId: number,
  ) {
    return this.activitiesService.addDependency(id, dependsOnId);
  }

  @Delete(':id/dependencies/:dependsOnId')
  removeDependency(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependsOnId', ParseIntPipe) dependsOnId: number,
  ) {
    return this.activitiesService.removeDependency(id, dependsOnId);
  }
}
