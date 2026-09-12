# MLCalc Documentation

Welcome to the MLCalc documentation. This directory contains comprehensive guides for understanding, deploying, and using the Margin Level Calculator.

## Documentation Index

### 📐 [Formulas](formulas.md)
Complete mathematical formulas used in MLCalc:
- Margin Level (ML%) calculation
- Equity and Floating P/L
- Liquidation price derivation
- Required balance adjustment
- Stop out detection logic
- Cross-currency calculations
- Hedging and netting

### 🏗️ [Architecture](architecture.md)
System architecture and design:
- Technology stack overview
- Database schema
- API architecture
- Frontend component structure
- Security model
- Deployment architecture
- Performance considerations
- Scalability options

### 🔌 [API Documentation](api.md)
Complete REST API reference:
- Authentication (OAuth 2.0, JWT)
- Screenshot endpoints (upload, OCR, share)
- Simulation endpoints (liquidation, balance adjustment)
- Instrument management
- Admin operations
- Error responses
- Rate limiting
- CORS configuration

### 🚀 [Deployment Guide](deployment.md)
Step-by-step deployment instructions:
- Prerequisites and requirements
- Quick start guide
- Manual deployment
- Cloudflare tunnel setup
- Google/Microsoft OAuth configuration
- Database management (backup/restore)
- Monitoring and troubleshooting
- Security hardening
- Scaling options
- Update and rollback procedures

## Quick Links

- **Live Demo**: https://mlcalc.prasanti.com
- **API Docs**: https://mlcalc.prasanti.com/api/docs
- **GitHub**: https://github.com/bhadip/mlcalc
- **Issues**: https://github.com/bhadip/mlcalc/issues

## Key Concepts

### Margin Level (ML%)

The margin level indicates account health:
- **> 500%**: Safe zone
- **100-500%**: Caution zone
- **< 100%**: Margin call
- **= 50%**: Stop out

### STOPPED OUT Condition

When `Balance == Equity`, the account is stopped out:
- All credit consumed
- All positions closed by broker
- UI locks automatically
- No further calculations possible

### Instrument Configuration

Each trading instrument has:
- **Contract Size**: Units per lot (e.g., 100,000 for EURUSD, 100 for XAUUSD)
- **Tick Size**: Minimum price increment
- **Tick Value**: Monetary value per tick
- **Point Value**: Tick_Value / Tick_Size

## Support

For issues and questions:
1. Check the [deployment troubleshooting](deployment.md#troubleshooting) section
2. Review the [API documentation](api.md#error-responses)
3. Open a [GitHub issue](https://github.com/bhadip/mlcalc/issues)

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details
