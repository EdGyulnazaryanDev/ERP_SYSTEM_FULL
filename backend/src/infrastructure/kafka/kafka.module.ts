import { Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KafkaEventForwarder } from './kafka-event-forwarder.service';
import { KafkaConsumerService } from './kafka-consumer.service';

@Global()
@Module({
  providers: [KafkaService, KafkaConsumerService, KafkaEventForwarder],
  exports: [KafkaService, KafkaConsumerService],
})
export class KafkaModule {}
