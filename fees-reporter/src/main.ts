import { NestFactory } from '@nestjs/core';
import { FeesReporterModule } from './fees-reporter.module';

async function bootstrap() {
  const app = await NestFactory.create(FeesReporterModule);
  await app.listen(3000);
}
bootstrap();
