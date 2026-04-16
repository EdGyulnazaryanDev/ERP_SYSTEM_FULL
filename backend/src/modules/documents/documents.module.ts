import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentGenerationController } from './controllers/document-generation.controller';
import { DocumentGenerationService } from './services/document-generation.service';
import { DocumentTemplate } from './entities/document-template.entity';
import { GeneratedDocument } from './entities/generated-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentTemplate,
      GeneratedDocument,
    ]),
  ],
  controllers: [
    DocumentGenerationController,
  ],
  providers: [
    DocumentGenerationService,
  ],
  exports: [
    DocumentGenerationService,
  ],
})
export class DocumentsModule {}
