import { Test, TestingModule } from '@nestjs/testing';
import { ForecasterService } from './forecaster.service';

describe('ForecasterService', () => {
  let service: ForecasterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForecasterService],
    }).compile();

    service = module.get<ForecasterService>(ForecasterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
