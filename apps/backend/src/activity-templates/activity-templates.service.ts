import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateActivityTemplateDto } from './dto/create-activity-template.dto';
import { UpdateActivityTemplateDto } from './dto/update-activity-template.dto';
import { ActivityTemplateDependency } from './entities/activity-template-dependency.entity';
import { ActivityTemplate } from './entities/activity-template.entity';

@Injectable()
export class ActivityTemplatesService {
  constructor(
    @InjectRepository(ActivityTemplate)
    private readonly templatesRepository: Repository<ActivityTemplate>,
    @InjectRepository(ActivityTemplateDependency)
    private readonly dependenciesRepository: Repository<ActivityTemplateDependency>,
  ) {}

  private assertValidOffset(businessDayOffset: number | undefined): void {
    if (businessDayOffset === 0) {
      throw new BadRequestException('businessDayOffset cannot be 0');
    }
  }

  findAll(): Promise<ActivityTemplate[]> {
    return this.templatesRepository.find();
  }

  findActive(): Promise<ActivityTemplate[]> {
    return this.templatesRepository.find({ where: { isActive: true } });
  }

  async findById(id: number): Promise<ActivityTemplate> {
    const template = await this.templatesRepository.findOne({ where: { id } });
    if (!template) throw new NotFoundException(`ActivityTemplate ${id} not found`);
    return template;
  }

  async create(dto: CreateActivityTemplateDto): Promise<ActivityTemplate> {
    this.assertValidOffset(dto.businessDayOffset);

    const template = this.templatesRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      responsibleId: dto.responsibleId ?? null,
      priority: dto.priority ?? undefined,
      businessDayOffset: dto.businessDayOffset,
      dueTime: dto.dueTime ?? null,
      estimatedHours: dto.estimatedHours ?? null,
      notes: dto.notes ?? null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.templatesRepository.save(template);

    if (dto.dependsOnTemplateIds?.length) {
      await this.replaceDependencies(saved.id, dto.dependsOnTemplateIds);
    }

    return saved;
  }

  async update(id: number, dto: UpdateActivityTemplateDto): Promise<ActivityTemplate> {
    const template = await this.findById(id);
    this.assertValidOffset(dto.businessDayOffset);

    if (dto.title !== undefined) template.title = dto.title;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.responsibleId !== undefined) template.responsibleId = dto.responsibleId;
    if (dto.priority !== undefined) template.priority = dto.priority;
    if (dto.businessDayOffset !== undefined) template.businessDayOffset = dto.businessDayOffset;
    if (dto.dueTime !== undefined) template.dueTime = dto.dueTime;
    if (dto.estimatedHours !== undefined) template.estimatedHours = dto.estimatedHours;
    if (dto.notes !== undefined) template.notes = dto.notes;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;

    const saved = await this.templatesRepository.save(template);

    if (dto.dependsOnTemplateIds !== undefined) {
      await this.replaceDependencies(id, dto.dependsOnTemplateIds);
    }

    return saved;
  }

  async getDependencies(templateId: number): Promise<ActivityTemplateDependency[]> {
    return this.dependenciesRepository.find({ where: { templateId } });
  }

  async addDependency(
    templateId: number,
    dependsOnTemplateId: number,
  ): Promise<ActivityTemplateDependency> {
    if (templateId === dependsOnTemplateId) {
      throw new BadRequestException('A template cannot depend on itself');
    }
    await this.findById(templateId);
    await this.findById(dependsOnTemplateId);

    const existing = await this.dependenciesRepository.findOne({
      where: { templateId, dependsOnTemplateId },
    });
    if (existing) return existing;

    return this.dependenciesRepository.save(
      this.dependenciesRepository.create({ templateId, dependsOnTemplateId }),
    );
  }

  async removeDependency(templateId: number, dependsOnTemplateId: number): Promise<void> {
    await this.dependenciesRepository.delete({ templateId, dependsOnTemplateId });
  }

  private async replaceDependencies(templateId: number, dependsOnTemplateIds: number[]): Promise<void> {
    await this.dependenciesRepository.delete({ templateId });
    for (const dependsOnTemplateId of dependsOnTemplateIds) {
      await this.addDependency(templateId, dependsOnTemplateId);
    }
  }
}
