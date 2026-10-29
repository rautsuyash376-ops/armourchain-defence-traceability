import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';


export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
 imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  SupabaseModule,
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
