import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { PrismaService } from '../common/prisma/prisma.service';

interface AcademicItemResponse { id: string; name: string; order?: number; }

class CreateAcademicItemDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional() @IsInt() @Min(0)
  order?: number;
}

class UpdateAcademicItemDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional() @IsInt() @Min(0)
  order?: number;
}

@ApiTags('academic-structure')
@Controller('academic')
@SkipThrottle({ auth: true })
export class AcademicStructureController {
  constructor(private readonly prisma: PrismaService) {}

  // ── Grades ──────────────────────────────────────────────────────────────────

  @Get('grades')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'List academic grades' })
  listGrades(): Promise<AcademicItemResponse[]> {
    return this.prisma.academicGrade.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
  }

  @Post('grades')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create academic grade (admin only)' })
  createGrade(@Body() dto: CreateAcademicItemDto): Promise<AcademicItemResponse> {
    return this.prisma.academicGrade.create({ data: { name: dto.name, order: dto.order ?? 0 } });
  }

  @Patch('grades/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update academic grade (admin only)' })
  updateGrade(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateAcademicItemDto): Promise<AcademicItemResponse> {
    return this.prisma.academicGrade.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  @Delete('grades/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete academic grade (admin only)' })
  async deleteGrade(@Param('id', ParseCuidPipe) id: string) {
    await this.prisma.academicGrade.delete({ where: { id } });
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  @Get('sections')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'List sections' })
  listSections(): Promise<AcademicItemResponse[]> {
    return this.prisma.academicSection.findMany({ orderBy: { name: 'asc' } });
  }

  @Post('sections')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create section (admin only)' })
  createSection(@Body() dto: CreateAcademicItemDto): Promise<AcademicItemResponse> {
    return this.prisma.academicSection.create({ data: { name: dto.name } });
  }

  @Patch('sections/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update section (admin only)' })
  updateSection(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateAcademicItemDto): Promise<AcademicItemResponse> {
    return this.prisma.academicSection.update({
      where: { id },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
    });
  }

  @Delete('sections/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete section (admin only)' })
  async deleteSection(@Param('id', ParseCuidPipe) id: string) {
    await this.prisma.academicSection.delete({ where: { id } });
  }

  // ── Departments ─────────────────────────────────────────────────────────────

  @Get('departments')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'List departments' })
  listDepartments(): Promise<AcademicItemResponse[]> {
    return this.prisma.academicDepartment.findMany({ orderBy: { name: 'asc' } });
  }

  @Post('departments')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create department (admin only)' })
  createDepartment(@Body() dto: CreateAcademicItemDto): Promise<AcademicItemResponse> {
    return this.prisma.academicDepartment.create({ data: { name: dto.name } });
  }

  @Patch('departments/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update department (admin only)' })
  updateDepartment(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateAcademicItemDto): Promise<AcademicItemResponse> {
    return this.prisma.academicDepartment.update({
      where: { id },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
    });
  }

  @Delete('departments/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete department (admin only)' })
  async deleteDepartment(@Param('id', ParseCuidPipe) id: string) {
    await this.prisma.academicDepartment.delete({ where: { id } });
  }
}
