import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectStatus } from '@workflow-brasal/shared';
import { Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';

export const FECHAMENTO_MENSAL_PROJECT_NAME = 'Fechamento Mensal';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  findAll(): Promise<Project[]> {
    return this.projectsRepository.find();
  }

  async findById(id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  create(dto: CreateProjectDto): Promise<Project> {
    const project = this.projectsRepository.create(dto);
    return this.projectsRepository.save(project);
  }

  async update(id: number, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findById(id);
    Object.assign(project, dto);
    return this.projectsRepository.save(project);
  }

  /**
   * Resolves (or creates, on first use) the single fixed "Fechamento Mensal" project.
   * This project is never chosen manually by the user — ClosureService.generateForMonth
   * is the sole caller.
   */
  async findOrCreateFechamentoMensal(): Promise<Project> {
    const existing = await this.projectsRepository.findOne({
      where: { name: FECHAMENTO_MENSAL_PROJECT_NAME },
    });
    if (existing) return existing;

    const project = this.projectsRepository.create({
      name: FECHAMENTO_MENSAL_PROJECT_NAME,
      description: 'Checklist recorrente de fechamento contábil mensal',
      status: ProjectStatus.ACTIVE,
    });
    return this.projectsRepository.save(project);
  }
}
