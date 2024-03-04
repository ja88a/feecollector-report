import { Test, TestingModule } from '@nestjs/testing';
import { FeesReporterController } from './fees-reporter.controller';
import { FeesReporterService } from './fees-reporter.service';

describe('FeesReporterController', () => {
  let feesReporterController: FeesReporterController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FeesReporterController],
      providers: [FeesReporterService],
    }).compile();

    feesReporterController = app.get<FeesReporterController>(FeesReporterController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(feesReporterController.getHello()).toBe('Hello World!');
    });
  });
});
