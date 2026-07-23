import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ArrivalsService } from './arrivals.service';
import { CreateArrivalDto } from './dto/create-arrival.dto';

@Controller('arrivals')
export class ArrivalsController {
  constructor(private readonly arrivalsService: ArrivalsService) {}

  @Get()
  findAll() {
    return this.arrivalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.arrivalsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateArrivalDto) {
    return this.arrivalsService.create(dto);
  }
}
